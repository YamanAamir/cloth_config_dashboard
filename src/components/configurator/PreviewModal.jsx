import React, { useRef, useState, useEffect } from "react";
import { Modal, Button, Space, Tooltip, Alert, Typography, Spin } from "antd";

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

const PreviewModal = ({ open, onClose, canvasRef, designColor = 'white' }) => {
    const iframeRef = useRef(null);

    const [garmentType, setGarmentType] = useState("tshirt");
    const [isAppReady, setIsAppReady] = useState(false);
    const [sending, setSending] = useState(false);

    const sendToIframe = (msg) => {
        iframeRef.current?.contentWindow?.postMessage(msg, "*");
    };

    const exportHighResCanvas = (sourceCanvas, scale = 2) => {
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = sourceCanvas.width * scale;
        exportCanvas.height = sourceCanvas.height * scale;
        const ctx = exportCanvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // White background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
        // Boost contrast and saturation via filter
        const imgData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            // Contrast boost: factor 1.3
            d[i]     = Math.min(255, Math.max(0, 1.3 * (d[i]     - 128) + 128));
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

    const sendDesign = (garment) => {
        const canvas = canvasRef?.current;
        if (!canvas) return;

        const g = garment || GARMENTS.find((item) => item.key === garmentType);
        if (!g) return;

        setSending(true);
        const scale = 3;
        const diffuse = exportHighResCanvas(canvas, scale);
        const opacity = createOpacityTexture(canvas, scale);
        const emissive = createEmissiveTexture(canvas, scale);

        // FIXED MAPPING
        sendToIframe(`${g.prefix}:back_diffuse: ${diffuse}`);
        sendToIframe(`${g.prefix}:back_opacity: ${opacity}`);
        sendToIframe(`${g.prefix}:back_emissive: ${emissive}`);

        setTimeout(() => setSending(false), 500);
    };

    useEffect(() => {
        const handler = (e) => {
            if (e.data === "app:ready") {
                setIsAppReady(true);

                const g = GARMENTS.find((item) => item.key === garmentType);

                if (g) {
                    sendToIframe(`Page : ${g.page}`);
                    sendToIframe(`${g.prefix}:${designColor}`);
                    setTimeout(() => sendDesign(g), 400);
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
        sendToIframe(`${g.prefix}:${designColor}`);
        setTimeout(() => {
            sendDesign(g);
        }, 300);
    };

    useEffect(() => {
        if (open) {
            setGarmentType("tshirt");
            setIsAppReady(false);
        }
    }, [open]);

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

            <div style={{ position: "relative" }}>
                {!isAppReady && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f5f5f5",
                            zIndex: 1,
                        }}
                    >
                        <Space direction="vertical" align="center">
                            <Spin size="large" />
                            <Typography.Text type="secondary">
                                Loading 3D preview...
                            </Typography.Text>
                        </Space>
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    id="preview-iframe"
                    src="https://playcanv.as/e/p/1b1eadeb/"
                    style={{
                        width: "100%",
                        height: "calc(90vh - 120px)",
                        border: "none",
                        display: "block",
                    }}
                    allow="autoplay"
                    title="3D Garment Preview"
                />
            </div>
        </Modal>
    );
};

export default PreviewModal;