import React, { useRef, useState, useEffect } from "react";
import { Modal, Button, Space, Tooltip, Alert, Typography } from "antd";

const GARMENTS = [
    {
        key: "tshirt",
        label: "T-Shirt",
        page: 1,
        prefix: "T-Shirt",
        icon: (
            <svg viewBox="0 0 100 100" width="26" height="26" fill="currentColor">
                <path d="M30,10 L10,30 L25,35 L25,90 L75,90 L75,35 L90,30 L70,10 L60,18 Q50,24 40,18 Z" />
            </svg>
        ),
    },
    {
        key: "sweatshirt",
        label: "Sweatshirt",
        page: 2,
        prefix: "SweatShirt",
        icon: (
            <svg viewBox="0 0 100 100" width="26" height="26" fill="currentColor">
                <path d="M30,10 L10,30 L25,35 L25,90 L75,90 L75,35 L90,30 L70,10 L62,20 Q50,28 38,20 Z" />
                <rect x="38" y="10" width="24" height="10" rx="4" />
            </svg>
        ),
    },
    {
        key: "hoodie",
        label: "Hoodie",
        page: 3,
        prefix: "Hoodie",
        icon: (
            <svg viewBox="0 0 100 100" width="26" height="26" fill="currentColor">
                <path d="M30,10 L10,30 L25,35 L25,90 L75,90 L75,35 L90,30 L70,10 L62,22 Q50,35 38,22 Z" />
                <path
                    d="M38,10 Q50,0 62,10 L62,22 Q50,35 38,22 Z"
                    opacity="0.4"
                />
            </svg>
        ),
    },
];

// Color palettes matching student configurator
const COLORS = {
    white: [
        { key: 'white', label: 'White', hex: '#ffffff', border: '#d9d9d9' },
        { key: 'natural', label: 'Natural', hex: '#faf0dc', border: '#e0d5b0' },
        { key: 'heatherGrey', label: 'Heather Grey', hex: '#c8c8c8', border: '#c8c8c8' },
        { key: 'red', label: 'Red', hex: '#cc0000', border: '#cc0000' },
        { key: 'blue', label: 'Blue', hex: '#0000ee', border: '#0000ee' },
        { key: 'purple', label: 'Purple', hex: '#4b0082', border: '#4b0082' },
    ],

    black: [

        { key: 'black', label: 'Black', hex: '#1a1a1a', border: '#1a1a1a' },
        { key: 'red', label: 'Red', hex: '#cc0000', border: '#cc0000' },
        { key: 'navy', label: 'Dark Blue', hex: '#0a1628', border: '#0a1628' },
        { key: 'blue', label: 'Blue', hex: '#0000ee', border: '#0000ee' },
        { key: 'purple', label: 'Purple', hex: '#4b0082', border: '#4b0082' },
        { key: 'oliveGreen', label: 'Olive Green', hex: '#6b6b3a', border: '#6b6b3a' },
    ]
};

const PreviewModal = ({ open, onClose, canvasRef, designColor = 'white' }) => {
    const iframeRef = useRef(null);

    const [garmentType, setGarmentType] = useState("tshirt");
    const [selectedColor, setSelectedColor] = useState("white");
    const [isAppReady, setIsAppReady] = useState(false);
    const [sending, setSending] = useState(false);

    const sendToIframe = (msg) => {
        // Log without the base64 data to keep console readable
        const logMsg = msg.length > 100
            ? `${msg.substring(0, 80)}... [base64 data, ${Math.round(msg.length / 1024)}KB]`
            : msg;
      
        iframeRef.current?.contentWindow?.postMessage(msg, "*");
    };

    const exportHighResCanvas = (sourceCanvas, scale = 2) => {
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = sourceCanvas.width * scale;
        exportCanvas.height = sourceCanvas.height * scale;
        const ctx = exportCanvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // No background fill — keep transparent so only design/text is sent
        ctx.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
        // Boost contrast (skip transparent pixels)
        const imgData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 10) continue; // skip transparent
            d[i] = Math.min(255, Math.max(0, 1.3 * (d[i] - 128) + 128));
            d[i + 1] = Math.min(255, Math.max(0, 1.3 * (d[i + 1] - 128) + 128));
            d[i + 2] = Math.min(255, Math.max(0, 1.3 * (d[i + 2] - 128) + 128));
        }
        ctx.putImageData(imgData, 0, 0);
        return exportCanvas.toDataURL("image/png", 1.0);
    };

    const createOpacityTexture = (canvas, scale = 3) => {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = canvas.width * scale;
        offCanvas.height = canvas.height * scale;
        const ctx = offCanvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // White background first
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
        ctx.drawImage(canvas, 0, 0, offCanvas.width, offCanvas.height);
        const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const brightness =
                0.299 * imgData.data[i] +
                0.587 * imgData.data[i + 1] +
                0.114 * imgData.data[i + 2];

            // invert + pure black/white
            const bw = brightness > 128 ? 0 : 255;

            imgData.data[i] = bw;
            imgData.data[i + 1] = bw;
            imgData.data[i + 2] = bw;
            imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return offCanvas.toDataURL("image/png");
    };

    const createEmissiveTexture = (canvas, scale = 3) => {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = canvas.width * scale;
        offCanvas.height = canvas.height * scale;

        const ctx = offCanvas.getContext("2d");

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

        ctx.drawImage(
            canvas,
            0,
            0,
            offCanvas.width,
            offCanvas.height
        );

        const imgData = ctx.getImageData(
            0,
            0,
            offCanvas.width,
            offCanvas.height
        );

        for (let i = 0; i < imgData.data.length; i += 4) {
            imgData.data[i] = 255 - imgData.data[i];
            imgData.data[i + 1] = 255 - imgData.data[i + 1];
            imgData.data[i + 2] = 255 - imgData.data[i + 2];
            imgData.data[i + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);

        return offCanvas.toDataURL("image/png");
    };
    const invertTexture = (base64, cb) => {
        const img = new Image();

        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;

            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);

            const data = ctx.getImageData(0, 0, c.width, c.height);

            for (let i = 0; i < data.data.length; i += 4) {
                data.data[i] = 255 - data.data[i];
                data.data[i + 1] = 255 - data.data[i + 1];
                data.data[i + 2] = 255 - data.data[i + 2];
                data.data[i + 3] = 255;
            }

            ctx.putImageData(data, 0, 0);
            cb(c.toDataURL("image/png"));
        };

        img.src = base64;
    };
    // Accept optional color override so callers can pass the latest value
    // and avoid stale closure issues (e.g. inside useEffect handlers)
    const sendDesign = (garment, colorOverride) => {
        const canvas = canvasRef?.current;
        if (!canvas) return;

        const g = garment || GARMENTS.find((item) => item.key === garmentType);
        if (!g) return;

        const activeColor = colorOverride !== undefined ? colorOverride : designColor;

        setSending(true);

        const exportCanvas = canvas.getExportCanvas ? canvas.getExportCanvas() : canvas;

        // Downscale to max 1024px — canvas is A3 (3508×4961), scale=3 was 10k+ px
        // 1024px is plenty for 3D preview quality and reduces data 10x
        const MAX_PX = 1024;
        const srcW = exportCanvas.width;
        const srcH = exportCanvas.height;
        const ratio = Math.min(MAX_PX / srcW, MAX_PX / srcH, 1);
        const dstW = Math.round(srcW * ratio);
        const dstH = Math.round(srcH * ratio);

        const scaled = document.createElement('canvas');
        scaled.width = dstW;
        scaled.height = dstH;
        const sctx = scaled.getContext('2d');
        sctx.imageSmoothingEnabled = true;
        sctx.imageSmoothingQuality = 'high';
        sctx.drawImage(exportCanvas, 0, 0, dstW, dstH);

       
        if (activeColor === 'black') {
            const opacity = createOpacityTexture(scaled, 1);
            invertTexture(opacity, (invOpacity) => {
                sendToIframe(`${g.prefix}:back_white_diffuse: ${invOpacity}`);
                sendToIframe(`${g.prefix}:back_white_opacity: ${invOpacity}`);
                setTimeout(() => setSending(false), 500);
            });
        } else if (activeColor === 'white') {
            const diffuse = exportHighResCanvas(scaled, 1);
            const opacity = createOpacityTexture(scaled, 1);
            sendToIframe(`${g.prefix}:back_black_diffuse: ${diffuse}`);
            sendToIframe(`${g.prefix}:back_black_opacity: ${opacity}`);
            setTimeout(() => setSending(false), 500);
        } else {
            setSending(false);
        }
    };

    // Keep a ref so the app:ready handler always reads the latest designColor
    // without needing to re-register the event listener on every render
    const designColorRef = useRef(designColor);
    useEffect(() => {
        designColorRef.current = designColor;
    }, [designColor]);

    useEffect(() => {
        const handler = (e) => {
            if (e.data === "app:ready") {
                setIsAppReady(true);

                const g = GARMENTS.find((item) => item.key === garmentType);

                if (g) {
                    sendToIframe(`Page : ${g.page}`);
                    sendToIframe(`${g.prefix}:${selectedColor}`);
                    // Pass the latest designColor via ref to avoid stale closure
                    setTimeout(() => sendDesign(g, designColorRef.current), 400);
                }
            }
        };

        window.addEventListener("message", handler);

        return () => {
            window.removeEventListener("message", handler);
        };
    }, [garmentType]);

    const handleGarmentSwitch = (g) => {
        setGarmentType(g.key);
        sendToIframe(`Page : ${g.page}`);
        sendToIframe(`${g.prefix}:${selectedColor}`);
        setTimeout(() => {
            sendDesign(g, designColorRef.current);
        }, 300);
    };

    const handleColorChange = (colorKey) => {
        setSelectedColor(colorKey);
        const g = GARMENTS.find(item => item.key === garmentType);
        if (g) sendToIframe(`${g.prefix}:${colorKey}`);
    };

    useEffect(() => {
        if (open) {
            setGarmentType("tshirt");
            setIsAppReady(false);
            // Default garment color matches print type:
            // dark garment (black designColor) → black garment
            // light garment (white designColor) → white garment
            const defaultGarment = designColor === 'black' ? 'black' : 'white';
            const palette = COLORS[designColor] || COLORS.white;
            // Use palette's first color, but prefer the matching garment color if available
            const paletteMatch = palette.find(c => c.key === defaultGarment);
            setSelectedColor(paletteMatch ? paletteMatch.key : palette[0].key);
        }
    }, [open, designColor]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="90vw"
            style={{ top: 20 }}
            styles={{ body: { padding: 0 } }}
            destroyOnHidden
        >
            <div
                style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Typography.Text strong>3D Preview</Typography.Text>

                <Space>
                    {GARMENTS.map((g) => (
                        <Tooltip key={g.key} title={g.label}>
                            <Button
                                type={garmentType === g.key ? "primary" : "default"}
                                style={{ padding: "4px 10px", height: "auto" }}
                                onClick={() => handleGarmentSwitch(g)}
                                loading={sending && garmentType === g.key}
                            >
                                {g.icon}
                            </Button>
                        </Tooltip>
                    ))}
                </Space>
            </div>

            <Alert
                message="Visual inspiration only — does not commit you or your students to the garment shown."
                type="info"
                showIcon
                banner
                style={{ fontSize: 12 }}
            />

            {/* Color Palette */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                    Garment Color
                </Typography.Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(COLORS[designColor] || COLORS.white).map(c => (
                        <div
                            key={c.key}
                            onClick={() => handleColorChange(c.key)}
                            title={c.label}
                            style={{
                                width: 28, height: 28,
                                borderRadius: 6,
                                background: c.hex,
                                border: selectedColor === c.key ? '3px solid #00b96b' : `2px solid ${c.border}`,
                                cursor: 'pointer',
                                boxShadow: selectedColor === c.key ? '0 0 0 2px #00b96b40' : 'none',
                                transition: 'all 0.15s',
                            }}
                        />
                    ))}
                </div>
            </div>

            <div style={{ position: "relative" }}>
                {/* Show loader until app is ready AND design has been sent */}
                {/* {(!isAppReady || sending) && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#ffffff",
                            zIndex: 1,
                            gap: 20,
                        }}
                    >
                        <img
                            src="/clothLogo.png"
                            alt="ClothConfig"
                            style={{ width: 220, height: 120, objectFit: 'contain', opacity: 0.85 }}
                        />
                        <div style={{ width: 200 }}>
                            <div style={{
                                height: 3,
                                borderRadius: 2,
                                background: '#e0e0e0',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%',
                                    borderRadius: 2,
                                    background: '#00b96b',
                                    animation: 'previewLoadingBar 1.4s ease-in-out infinite',
                                }} />
                            </div>
                        </div>
                        <style>{`
                            @keyframes previewLoadingBar {
                                0%   { width: 0%;   margin-left: 0; }
                                50%  { width: 60%;  margin-left: 20%; }
                                100% { width: 0%;   margin-left: 100%; }
                            }
                        `}</style>
                    </div>
                )} */}

                <iframe
                    ref={iframeRef}
                    id="preview-iframe"
                    src="https://playcanv.as/e/p/1b1eadeb/"
                    style={{
                        width: "100%",
                        height: "calc(90vh - 160px)",
                        border: "none",
                        display: "block",
                        // Keep iframe mounted but invisible during load so postMessage works
                        // visibility: 'visible',
                    }}
                    allow="autoplay"
                    title="3D Garment Preview"
                />
            </div>
        </Modal>
    );
};

export default PreviewModal;