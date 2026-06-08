import React, { useState } from 'react';
import { Tabs, Row, Col, Card, Spin, Empty, Typography, Button, Modal, Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { getUploadsUrl } from '../../utils/constants';

const { Text } = Typography;

const DesignGallery = ({
    backDesigns, designsLoading,
    libraryDesigns, libraryLoading,
    countries, myClass, settingCountry,
    selectedDesignId, galleryTab, setGalleryTab,
    onSelectDesign, onSetCountry,
    isLocked = false,
}) => {
    const [countryModalOpen, setCountryModalOpen] = useState(false);
    const [pendingCountry, setPendingCountry] = useState(null);

    // Has CR selected a study trip country?
    const hasCountry = !!myClass?.country_id;

    const handleOpenCountryModal = () => {
        setPendingCountry(myClass?.country_id || null);
        setCountryModalOpen(true);
    };

    const handleConfirmCountry = async () => {
        if (onSetCountry) await onSetCountry(pendingCountry);
        setCountryModalOpen(false);
    };

    // Country Logos tab content
    const countryLogosContent = () => {
        if (!hasCountry) {
            // No country selected — show prompt card
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '32px 16px', gap: 12,
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%)',
                    borderRadius: 12, border: '1px dashed #91d5ff',
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28,
                    }}>
                        🌍
                    </div>
                    <Text strong style={{ fontSize: 18 }}>Studietur</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>Vælg destinationsland</Text>
                    <div style={{
                        background: '#f5f5f5', borderRadius: 6,
                        padding: '4px 14px', fontSize: 13, color: '#666',
                    }}>
                        Intet land valgt
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<GlobalOutlined />}
                        onClick={handleOpenCountryModal}
                        disabled={isLocked}
                        style={{
                            width: '100%', maxWidth: 280, marginTop: 4,
                            background: 'linear-gradient(135deg, #00b96b, #00875a)',
                            border: 'none', height: 44, fontSize: 15, fontWeight: 600,
                        }}
                    >
                        Vælg Land
                    </Button>
                </div>
            );
        }

        // Country is selected — show library designs
        if (libraryLoading) return <Spin />;
        if (libraryDesigns.length === 0) {
            return (
                <Empty
                    description="Ingen designs til dit land"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        return (
            <Row gutter={[8, 8]}>
                {libraryDesigns.map(d => (
                    <Col span={12} key={d.id}>
                        <Card
                            hoverable={!!onSelectDesign}
                            onClick={() => onSelectDesign?.(d)}
                            style={{
                                border: selectedDesignId === d.id ? '2px solid #00b96b' : '1px solid #f0f0f0',
                                cursor: onSelectDesign ? 'pointer' : 'default',
                            }}
                            styles={{ body: { padding: 8 } }}
                        >
                            <img
                                src={getUploadsUrl(d.file_path)}
                                alt={d.name}
                                style={{ width: '100%', height: 80, objectFit: 'contain' }}
                            />
                            <Typography.Text ellipsis style={{ fontSize: 11 }}>{d.name}</Typography.Text>
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    };

    return (
        <>
            <Tabs
                activeKey={galleryTab}
                onChange={setGalleryTab}
                size="small"
                items={[
                    {
                        key: 'backdesign',
                        label: 'Bagdesign',
                        children: designsLoading ? <Spin /> :
                            backDesigns.length === 0
                                ? <Empty description="Ingen godkendte bagdesigns tilgængelige" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                : <Row gutter={[8, 8]}>
                                    {backDesigns.map(d => (
                                        <Col span={12} key={d.id}>
                                            <Card
                                                hoverable={!!onSelectDesign}
                                                onClick={() => onSelectDesign?.(d)}
                                                style={{
                                                    border: selectedDesignId === d.id ? '2px solid #00b96b' : '1px solid #f0f0f0',
                                                    cursor: onSelectDesign ? 'pointer' : 'default',
                                                }}
                                                bodyStyle={{ padding: 8 }}
                                            >
                                                <img
                                                    src={`${getUploadsUrl(d.file_path)}?t=${d.updated_at ? new Date(d.updated_at).getTime() : d.id}`}
                                                    alt={d.name}
                                                    style={{ width: '100%', height: 80, objectFit: 'contain' }}
                                                />
                                                <Typography.Text ellipsis style={{ fontSize: 11 }}>{d.name}</Typography.Text>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                    },
                    {
                        key: 'countrylogos',
                        label: 'Landelogoer',
                        children: countryLogosContent(),
                    }
                ]}
            />

            <Modal
                title={
                    <Space>
                        <GlobalOutlined style={{ color: '#7c3aed' }} />
                        <span>Vælg studietur destination</span>
                    </Space>
                }
                open={countryModalOpen}
                onOk={handleConfirmCountry}
                onCancel={() => setCountryModalOpen(false)}
                okText="Bekræft"
                cancelText="Annuller"
                confirmLoading={settingCountry}
                centered
                destroyOnHidden
            >
                <div style={{ marginBottom: 12 }}>
                    <Text type="secondary">Vælg det land, din klasse tager på studietur til</Text>
                </div>
                {countries.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                    }}>
                        {countries.map((country) => (
                            <Card
                                key={country.id}
                                hoverable
                                size="small"
                                onClick={() => setPendingCountry(country.id)}
                                style={{
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    border: pendingCountry === country.id ? '2px solid #00b96b' : '1px solid #f0f0f0',
                                    background: pendingCountry === country.id ? '#e6fff5' : '#fff',
                                }}
                                bodyStyle={{ padding: '10px 6px' }}
                            >
                                <Text strong style={{ fontSize: '13px' }}>{country.name}</Text>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Empty description="Ingen lande tilgængelige" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
                {!pendingCountry && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                        Rydning af valg fjerner landelogoerne fra din galleri.
                    </Text>
                )}
            </Modal>
        </>
    );
};

export default DesignGallery;
