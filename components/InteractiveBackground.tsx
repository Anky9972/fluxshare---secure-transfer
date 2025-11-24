import React, { useEffect, useRef } from 'react';

const InteractiveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const mouse = { x: -1000, y: -1000 };
        const gridGap = 40;
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

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw connecting lines
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
            ctx.lineWidth = 1;

            // Update points based on mouse position
            points.forEach(point => {
                const dx = mouse.x - point.originX;
                const dy = mouse.y - point.originY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 150;
                const force = Math.max(0, (maxDist - distance) / maxDist);
                const angle = Math.atan2(dy, dx);

                const moveX = Math.cos(angle) * force * 20;
                const moveY = Math.sin(angle) * force * 20;

                point.x = point.originX - moveX;
                point.y = point.originY - moveY;

                // Draw small dots at intersections
                ctx.fillStyle = `rgba(0, 243, 255, ${0.1 + force * 0.5})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 1 + force * 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw grid lines
            ctx.beginPath();
            for (let i = 0; i < points.length; i++) {
                const p = points[i];

                // Find neighbors (right and bottom)
                // This is a simplified neighbor finding for a regular grid
                // Since points are pushed in order, we can estimate neighbors

                // Right neighbor
                if (i + 1 < points.length && points[i + 1].originX > p.originX && points[i + 1].originY === p.originY) {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(points[i + 1].x, points[i + 1].y);
                }

                // Bottom neighbor
                // We need to find the point with same X but next Y
                // Since the loop is x then y, the next point in array is actually next Y
                // Wait, the loop was x then y. 
                // for x... for y... points.push
                // so points[i+1] is same x, next y.

                // Let's re-verify loop order:
                // for x = 0...
                //   for y = 0...
                //     push

                // So adjacent in array is same X, next Y (vertical neighbor)
                if (i + 1 < points.length && points[i + 1].originX === p.originX) {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(points[i + 1].x, points[i + 1].y);
                }

                // Horizontal neighbor is harder to find by index in this 1D array structure without calculating stride
                // Stride depends on height/gridGap.
                const stride = Math.floor(height / gridGap) + 1;
                if (i + stride < points.length) {
                    // Check if it's actually the horizontal neighbor (same Y)
                    if (Math.abs(points[i + stride].originY - p.originY) < 1) {
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(points[i + stride].x, points[i + stride].y);
                    }
                }
            }
            ctx.stroke();

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none bg-[#050510]"
        />
    );
};

export default InteractiveBackground;
