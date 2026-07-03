import { useRef, useState, useEffect } from 'react';
import { Modal, Button, Space, Tooltip, Alert, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

const GARMENTS = [
    {
        key: 'tshirt',
        label: 'T-Shirt',
        page: 1,
        prefix: 'T-Shirt',
        icon: (
            <svg viewBox="0 0 100 100" width="22" height="22" fill="currentColor">
                <path d="M30,10 L10,30 L25,35 L25,90 L75,90 L75,35 L90,30 L70,10 L60,18 Q50,24 40,18 Z" />
            </svg>
        ),
    },
];

const COLORS = [
    { key: 'white',       label: 'White',        hex: '#ffffff', border: '#d9d9d9' },
    { key: 'natural',     label: 'Natural',       hex: '#faf0dc', border: '#e0d5b0' },
    { key: 'heatherGrey', label: 'Heather Grey',  hex: '#c8c8c8', border: '#c8c8c8' },
    { key: 'black',       label: 'Black',         hex: '#1a1a1a', border: '#1a1a1a' },
    { key: 'red',         label: 'Red',           hex: '#cc0000', border: '#cc0000' },
    { key: 'blue',        label: 'Blue',          hex: '#0000ee', border: '#0000ee' },
    { key: 'purple',      label: 'Purple',        hex: '#4b0082', border: '#4b0082' },
];

const LOGO_POSITIONS = [
    { key: 'rightChest',  label: 'Right Chest',  diffuseKey: 'rightChest_diffuse',  opacityKey: 'rightChest_opacity',  garments: ['tshirt']  },
];


const LogoPreviewModal = ({ open, onClose, logoUrl, logoName = 'Logo' }) => {
    const iframeRef       = useRef(null);
    const [garment,       setGarment]       = useState('tshirt');
    const [color,         setColor]         = useState('white');
    const [position,      setPosition]      = useState('rightChest');
    const [isAppReady,    setIsAppReady]    = useState(false);
    const [sending,       setSending]       = useState(false);

    // Refs to avoid stale closures in event handlers
    const garmentRef  = useRef(garment);
    const colorRef    = useRef(color);
    const positionRef = useRef(position);
    useEffect(() => { garmentRef.current  = garment;  }, [garment]);
    useEffect(() => { colorRef.current    = color;    }, [color]);
    useEffect(() => { positionRef.current = position; }, [position]);

    const sendToIframe = (msg) => {
        iframeRef.current?.contentWindow?.postMessage(msg, '*');
    };

    // Send the logo to the current position in the iframe
    const sendLogo = (garmentObj, colorKey, posKey) => {
        if (!logoUrl) return;
        setSending(true);

        const pos = LOGO_POSITIONS.find(p => p.key === posKey) || LOGO_POSITIONS[0];
        const g   = garmentObj || GARMENTS.find(g => g.key === garment);
        if (!g) { setSending(false); return; }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Diffuse — image as-is scaled to 512px max
            const MAX = 512;
            const ratio = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1);
            const dw = Math.round(img.naturalWidth  * ratio);
            const dh = Math.round(img.naturalHeight * ratio);

            const diffuseCanvas = document.createElement('canvas');
            diffuseCanvas.width  = dw;
            diffuseCanvas.height = dh;
            const dctx = diffuseCanvas.getContext('2d');
            dctx.imageSmoothingEnabled = true;
            dctx.imageSmoothingQuality = 'high';
            // Fill with white to prevent dark fringes
            dctx.fillStyle = '#ffffff';
            dctx.fillRect(0, 0, dw, dh);
            dctx.drawImage(img, 0, 0, dw, dh);
            const diffuseDataUrl = diffuseCanvas.toDataURL('image/png', 1.0);

            // Determine if image has alpha
            const tmpC = document.createElement("canvas");
            tmpC.width = img.naturalWidth; 
            tmpC.height = img.naturalHeight;
            const tmpCtx = tmpC.getContext("2d");
            tmpCtx.drawImage(img, 0, 0);
            const tmpD = tmpCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

            let imgHasAlpha = false;
            for (let i = 3; i < tmpD.data.length; i += 4) {
                if (tmpD.data[i] < 254) { imgHasAlpha = true; break; }
            }

            // Opacity mask
            const opacityCanvas = document.createElement('canvas');
            opacityCanvas.width  = dw;
            opacityCanvas.height = dh;
            const octx = opacityCanvas.getContext('2d');
            octx.drawImage(img, 0, 0, dw, dh);
            const id = octx.getImageData(0, 0, dw, dh);

            if (imgHasAlpha) {
                for (let i = 0; i < id.data.length; i += 4) {
                    const bw = id.data[i + 3] > 127 ? 255 : 0;
                    id.data[i] = id.data[i + 1] = id.data[i + 2] = bw;
                    id.data[i + 3] = 255;
                }
            } else {
                const gC = (px, py) => { 
                    const idx = (py * img.naturalWidth + px) * 4; 
                    return [tmpD.data[idx], tmpD.data[idx + 1], tmpD.data[idx + 2]]; 
                };
                const corners = [
                    gC(0, 0), 
                    gC(img.naturalWidth - 1, 0), 
                    gC(0, img.naturalHeight - 1), 
                    gC(img.naturalWidth - 1, img.naturalHeight - 1)
                ];
                const bgR = corners.reduce((s, c) => s + c[0], 0) / 4;
                const bgG = corners.reduce((s, c) => s + c[1], 0) / 4;
                const bgB = corners.reduce((s, c) => s + c[2], 0) / 4;
                const thr = 90;

                for (let i = 0; i < id.data.length; i += 4) {
                    const a = id.data[i + 3]; 
                    let bw;
                    if (a < 10) { 
                        bw = 0; 
                    } else { 
                        const diff = Math.abs(id.data[i] - bgR) + Math.abs(id.data[i + 1] - bgG) + Math.abs(id.data[i + 2] - bgB); 
                        bw = diff > thr ? 255 : 0; 
                    }
                    id.data[i] = id.data[i + 1] = id.data[i + 2] = bw; 
                    id.data[i + 3] = 255;
                }
            }
            octx.putImageData(id, 0, 0);
            const opacityDataUrl = opacityCanvas.toDataURL('image/png', 1.0);

            sendToIframe(`${g.prefix}:${pos.diffuseKey}: ${diffuseDataUrl}`);
            sendToIframe(`${g.prefix}:${pos.opacityKey}: ${opacityDataUrl}`);

            setTimeout(() => setSending(false), 500);
        };
        img.onerror = () => setSending(false);
        img.src = logoUrl;
    };

    // When iframe signals it's ready
    useEffect(() => {
        const handler = (e) => {
            if (e.data === 'app:ready') {
                setIsAppReady(true);
                const g = GARMENTS.find(g => g.key === garmentRef.current);
                if (g) {
                    sendToIframe(`Page : ${g.page}`);
                    sendToIframe(`${g.prefix}:${colorRef.current}`);
                    // Give PlayCanvas camera enough time to position before sending textures
                    setTimeout(() => sendLogo(g, colorRef.current, positionRef.current), 400);
                }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [garment, logoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset on open
    useEffect(() => {
        if (open) {
            setGarment('tshirt');
            setColor('white');
            setPosition('rightChest');
            setIsAppReady(false);
        }
    }, [open]);

    

    const handleColorChange = (colorKey) => {
        setColor(colorKey);
        const g = GARMENTS.find(g => g.key === garment);
        if (g) sendToIframe(`${g.prefix}:${colorKey}`);
    };

  

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="85vw"
            style={{ top: 20 }}
            styles={{ body: { padding: 0 } }}
            title={
                <Space>
                    <EyeOutlined />
                    <span>3D Preview — {logoName}</span>
                </Space>
            }
            destroyOnHidden
        >
           

            <Alert
                message="Visual inspiration only — does not commit you or your students to the garment shown."
                type="info"
                showIcon
                banner
                style={{ fontSize: 12 }}
            />

            {/* Color palette */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                    Garment Color
                </Typography.Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {COLORS.map(c => (
                        <div
                            key={c.key}
                            onClick={() => handleColorChange(c.key)}
                            title={c.label}
                            style={{
                                width: 28, height: 28,
                                borderRadius: 6,
                                background: c.hex,
                                border: color === c.key ? '3px solid #00b96b' : `2px solid ${c.border}`,
                                cursor: 'pointer',
                                boxShadow: color === c.key ? '0 0 0 2px #00b96b40' : 'none',
                                transition: 'all 0.15s',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* iframe */}
            <iframe
                ref={iframeRef}
                src="https://playcanv.as/e/p/1b1eadeb/"
                style={{
                    width: '100%',
                    height: 'calc(85vh - 200px)',
                    border: 'none',
                    display: 'block',
                }}
                allow="autoplay"
                title="3D Logo Preview"
            />
        </Modal>
    );
};

export default LogoPreviewModal;
