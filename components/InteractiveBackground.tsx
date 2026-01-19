import React, { useEffect, useRef, useCallback } from 'react';

const InteractiveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const isVisibleRef = useRef(true);
    const lastFrameTimeRef = useRef(0);
    const FPS_LIMIT = 30; // Limit to 30fps for better performance
    const FRAME_MIN_TIME = 1000 / FPS_LIMIT;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const mouse = { x: -1000, y: -1000 };
        const gridGap = 50; // Increased gap for fewer points
        const points: { x: number; y: number; originX: number; originY: number }[] = [];

        // Initialize grid points
        const init = () => {
            points.length = 0;
            for (let x = 0; x <= width; x += gridGap) {
                for (let y = 0; y <= height; y += gridGap) {
                    points.push({ x, y, originX: x, originY: y });
                }
            }
        };

        init();

        // Throttled resize handler
        let resizeTimeout: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
                init();
            }, 150);
        };

        // Throttled mouse handler
        let lastMouseUpdate = 0;
        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            if (now - lastMouseUpdate < 16) return; // ~60fps throttle for mouse
            lastMouseUpdate = now;
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        // Visibility change handler - pause animation when tab not visible
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
            if (isVisibleRef.current) {
                lastFrameTimeRef.current = 0;
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        window.addEventListener('resize', handleResize, { passive: true });
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const animate = (timestamp: number) => {
            if (!isVisibleRef.current) return;

            // FPS limiting
            if (timestamp - lastFrameTimeRef.current < FRAME_MIN_TIME) {
                animationRef.current = requestAnimationFrame(animate);
                return;
            }
            lastFrameTimeRef.current = timestamp;

            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, width, height);

            // Draw connecting lines
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
            ctx.lineWidth = 1;

            // Update points based on mouse position
            const maxDist = 120; // Reduced interaction radius
            points.forEach(point => {
                const dx = mouse.x - point.originX;
                const dy = mouse.y - point.originY;
                const distSq = dx * dx + dy * dy;
                const maxDistSq = maxDist * maxDist;
                
                if (distSq < maxDistSq) {
                    const distance = Math.sqrt(distSq);
                    const force = (maxDist - distance) / maxDist;
                    const angle = Math.atan2(dy, dx);

                    const moveX = Math.cos(angle) * force * 15;
                    const moveY = Math.sin(angle) * force * 15;

                    point.x = point.originX - moveX;
                    point.y = point.originY - moveY;

                    // Draw small dots at intersections (only for affected points)
                    ctx.fillStyle = `rgba(0, 243, 255, ${0.1 + force * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 1 + force * 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    point.x = point.originX;
                    point.y = point.originY;
                }
            });

            // Draw grid lines - batch path operations
            ctx.beginPath();
            const stride = Math.floor(height / gridGap) + 1;
            
            for (let i = 0; i < points.length; i++) {
                const p = points[i];

                // Vertical neighbor (next in array with same X)
                if (i + 1 < points.length && points[i + 1].originX === p.originX) {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(points[i + 1].x, points[i + 1].y);
                }

                // Horizontal neighbor
                if (i + stride < points.length && Math.abs(points[i + stride].originY - p.originY) < 1) {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(points[i + stride].x, points[i + stride].y);
                }
            }
            ctx.stroke();

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimeout(resizeTimeout);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
        />
    );
};

export default InteractiveBackground;
