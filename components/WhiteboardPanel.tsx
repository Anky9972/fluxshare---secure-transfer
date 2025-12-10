// Interactive Whiteboard - Collaborative drawing canvas
import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Eraser, Square, Circle, Trash2, Download, Palette, Undo, Redo, MousePointer, Sparkles } from 'lucide-react';

interface WhiteboardProps {
    onStrokeDraw?: (stroke: DrawStroke) => void;
    onClear?: () => void;
    onAnalyze?: (imageData: string) => Promise<void>;
    className?: string;
    remoteStrokes?: DrawStroke[];
}

interface DrawStroke {
    id: string;
    type: 'pen' | 'eraser' | 'rect' | 'circle';
    points: { x: number; y: number }[];
    color: string;
    width: number;
    timestamp: number;
}

interface Point {
    x: number;
    y: number;
}

const colors = [
    '#00f3ff', // Cyan
    '#bc13fe', // Purple
    '#00ff9d', // Green
    '#ff0055', // Pink
    '#f3ff00', // Yellow
    '#ffffff', // White
    '#ff6b00', // Orange
    '#00bfff', // Sky Blue
];

const WhiteboardPanel: React.FC<WhiteboardProps> = ({
    onStrokeDraw,
    onClear,
    onAnalyze,
    remoteStrokes = [],
    className = ''
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'rect' | 'circle'>('pen');
    const [color, setColor] = useState('#00f3ff');
    const [lineWidth, setLineWidth] = useState(3);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [strokes, setStrokes] = useState<DrawStroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [history, setHistory] = useState<DrawStroke[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size
        const updateSize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            redrawCanvas();
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        redrawCanvas();
    }, [strokes, remoteStrokes]);

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas to transparent (letting container background show)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw all strokes (local + remote)
        [...strokes, ...remoteStrokes].forEach(stroke => {
            drawStroke(ctx, stroke);
        });
    };

    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: DrawStroke) => {
        if (stroke.points.length === 0) return;

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.type === 'pen' || stroke.type === 'eraser') {
            ctx.globalCompositeOperation = stroke.type === 'eraser' ? 'destination-out' : 'source-over';
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            stroke.points.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        } else if (stroke.type === 'rect' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1];
            ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (stroke.type === 'circle' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[stroke.points.length - 1];
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.beginPath();
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    };

    const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const point = getCanvasPoint(e);
        setIsDrawing(true);
        setCurrentStroke([point]);
        setStartPoint(point);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const point = getCanvasPoint(e);

        if (tool === 'pen' || tool === 'eraser') {
            setCurrentStroke(prev => [...prev, point]);

            // Use requestAnimationFrame for smooth 60fps drawing
            requestAnimationFrame(() => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (ctx && currentStroke.length > 0) {
                    ctx.strokeStyle = tool === 'eraser' ? '#050510' : color;
                    ctx.lineWidth = lineWidth;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
                    ctx.beginPath();
                    ctx.moveTo(currentStroke[currentStroke.length - 1].x, currentStroke[currentStroke.length - 1].y);
                    ctx.lineTo(point.x, point.y);
                    ctx.stroke();
                    ctx.globalCompositeOperation = 'source-over';
                }
            });
        } else {
            // For shapes, just update the end point
            setCurrentStroke([startPoint!, point]);

            // Use requestAnimationFrame for shape preview
            requestAnimationFrame(() => {
                redrawCanvas();

                // Draw preview
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (ctx && startPoint) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.lineCap = 'round';
                    if (tool === 'rect') {
                        ctx.strokeRect(startPoint.x, startPoint.y, point.x - startPoint.x, point.y - startPoint.y);
                    } else if (tool === 'circle') {
                        const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
                        ctx.beginPath();
                        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                }
            });
        }
    };

    const stopDrawing = () => {
        if (!isDrawing || currentStroke.length === 0) {
            setIsDrawing(false);
            return;
        }

        const stroke: DrawStroke = {
            id: `stroke_${Date.now()}_${Math.random()}`,
            type: tool,
            points: currentStroke,
            color: tool === 'eraser' ? '#050510' : color,
            width: lineWidth,
            timestamp: Date.now()
        };

        const newStrokes = [...strokes, stroke];
        setStrokes(newStrokes);

        // Update history
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newStrokes);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);

        // Send stroke to peer
        if (onStrokeDraw) {
            onStrokeDraw(stroke);
        }

        setIsDrawing(false);
        setCurrentStroke([]);
        setStartPoint(null);
    };

    const clearCanvas = () => {
        setStrokes([]);
        setHistory([[]]);
        setHistoryStep(0);
        redrawCanvas();
        if (onClear) onClear();
    };

    const undo = () => {
        if (historyStep > 0) {
            setHistoryStep(historyStep - 1);
            setStrokes(history[historyStep - 1]);
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1) {
            setHistoryStep(historyStep + 1);
            setStrokes(history[historyStep + 1]);
        }
    };

    const downloadCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `whiteboard_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <div className={`bg-[#050510]/95 rounded-xl border border-[#333] overflow-hidden backdrop-blur-xl shadow-[0_0_30px_rgba(0,243,255,0.05)] ${className}`}>
            {/* Toolbar */}
            <div className="bg-[#050510] border-b border-[#333] p-3 flex flex-wrap items-center gap-2">
                {/* Drawing Tools */}
                <div className="flex gap-1 border-r border-[#333] pr-3">
                    <button
                        onClick={() => setTool('pen')}
                        className={`p-2 rounded transition-colors ${tool === 'pen' ? 'bg-[#00f3ff] text-black' : 'bg-[#1a1a2e] text-white hover:bg-[#2a2a3e]'}`}
                        title="Pen"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-[#ff0055] text-black' : 'bg-[#1a1a2e] text-white hover:bg-[#2a2a3e]'}`}
                        title="Eraser"
                    >
                        <Eraser size={16} />
                    </button>
                    <button
                        onClick={() => setTool('rect')}
                        className={`p-2 rounded transition-colors ${tool === 'rect' ? 'bg-[#bc13fe] text-black' : 'bg-[#1a1a2e] text-white hover:bg-[#2a2a3e]'}`}
                        title="Rectangle"
                    >
                        <Square size={16} />
                    </button>
                    <button
                        onClick={() => setTool('circle')}
                        className={`p-2 rounded transition-colors ${tool === 'circle' ? 'bg-[#00ff9d] text-black' : 'bg-[#1a1a2e] text-white hover:bg-[#2a2a3e]'}`}
                        title="Circle"
                    >
                        <Circle size={16} />
                    </button>
                </div>

                {/* Color Picker */}
                <div className="relative border-r border-[#333] pr-3">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="p-2 rounded bg-[#1a1a2e] hover:bg-[#2a2a3e] transition-colors flex items-center gap-2"
                    >
                        <Palette size={16} className="text-white" />
                        <div
                            className="w-6 h-6 rounded border-2 border-white/20"
                            style={{ backgroundColor: color }}
                        />
                    </button>
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-2 bg-[#1a1a2e] border border-[#333] rounded-lg p-2 grid grid-cols-4 gap-2 z-50">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        setColor(c);
                                        setShowColorPicker(false);
                                    }}
                                    className="w-8 h-8 rounded border-2 border-white/20 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Line Width */}
                <div className="flex items-center gap-2 border-r border-[#333] pr-3">
                    <span className="text-xs text-gray-400">Size:</span>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="w-20"
                    />
                    <span className="text-xs text-white w-6">{lineWidth}</span>
                </div>

                {/* History */}
                <div className="flex gap-1 border-r border-[#333] pr-3">
                    <button
                        onClick={undo}
                        disabled={historyStep === 0}
                        className="p-2 rounded bg-[#1a1a2e] text-white hover:bg-[#2a2a3e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Undo"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={historyStep === history.length - 1}
                        className="p-2 rounded bg-[#1a1a2e] text-white hover:bg-[#2a2a3e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Redo"
                    >
                        <Redo size={16} />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-1 border-l border-[#333] pl-3">
                    <button
                        onClick={clearCanvas}
                        className="p-2 rounded bg-[#1a1a2e] text-white hover:bg-[#ff0055] hover:text-black transition-colors"
                        title="Clear All"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={downloadCanvas}
                        className="p-2 rounded bg-[#1a1a2e] text-white hover:bg-[#00ff9d] hover:text-black transition-colors"
                        title="Download"
                    >
                        <Download size={16} />
                    </button>
                    {onAnalyze && (
                        <button
                            onClick={() => {
                                const canvas = canvasRef.current;
                                if (canvas && onAnalyze) {
                                    onAnalyze(canvas.toDataURL());
                                }
                            }}
                            className="p-2 rounded bg-[#1a1a2e] text-[#bc13fe] hover:bg-[#bc13fe] hover:text-white transition-colors"
                            title="Analyze with AI"
                        >
                            <Sparkles size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-[500px] cursor-crosshair"
            />
        </div>
    );
};

export default WhiteboardPanel;
