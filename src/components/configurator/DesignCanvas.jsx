import React, { useEffect, useRef } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

const getTextColor = (garmentColor) => (garmentColor === 'black' ? '#ffffff' : '#000000');

const DesignCanvas = ({
    imagePreview, textElements, designColor,
    isDragging, setIsDragging,
    selectedTextId, setSelectedTextId,
    dragOffset, setDragOffset,
    setTextElements, canvasRef,
    onCanvasUpdate
}) => {
    useEffect(() => {
        if (!canvasRef.current || !imagePreview) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            canvas.width = 800;
            canvas.height = 800;
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Contain: fit whole image inside canvas
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            textElements.forEach(el => {
                ctx.save();
                ctx.translate(el.x, el.y);
                ctx.rotate((el.rotation * Math.PI) / 180);
                ctx.font = `${el.fontSize}px ${el.fontFamily}`;
                ctx.fillStyle = getTextColor(designColor);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, 0, 0);
                ctx.restore();
            });
            if (onCanvasUpdate) setTimeout(() => onCanvasUpdate(canvas), 50);
        };
        img.src = imagePreview;
    }, [imagePreview, textElements, designColor]);

    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        for (let i = textElements.length - 1; i >= 0; i--) {
            const el = textElements[i];
            if (el.locked) continue;
            const ctx = canvas.getContext('2d');
            ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const tw = ctx.measureText(el.text).width;
            const th = el.fontSize;
            if (mx >= el.x - tw / 2 && mx <= el.x + tw / 2 && my >= el.y - th / 2 && my <= el.y + th / 2) {
                setSelectedTextId(el.id);
                setIsDragging(true);
                setDragOffset({ x: mx - el.x, y: my - el.y });
                return;
            }
        }
        setSelectedTextId(null);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !selectedTextId || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        setTextElements(prev => prev.map(el =>
            el.id === selectedTextId ? { ...el, x: mx - dragOffset.x, y: my - dragOffset.y } : el
        ));
    };

    if (!imagePreview) return (
        <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
            <InboxOutlined style={{ fontSize: 48, marginBottom: 12 }} />
            <div>Select a design from the left to start</div>
        </div>
    );

    return (
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                Drag names to reposition on the back design
            </Typography.Text>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                style={{
                    maxWidth: '100%', borderRadius: 4,
                    border: '1px solid #d9d9d9',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    display: 'block', margin: '0 auto'
                }}
            />
        </div>
    );
};

export default DesignCanvas;
