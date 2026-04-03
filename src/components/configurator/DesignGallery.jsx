import React from 'react';
import { Tabs, Row, Col, Card, Spin, Empty, Select, Typography } from 'antd';
import { getUploadsUrl } from '../../utils/constants';

const DesignGallery = ({
    backDesigns, designsLoading,
    libraryDesigns, libraryLoading,
    countries, myClass, settingCountry,
    selectedDesignId, galleryTab, setGalleryTab,
    onSelectDesign, onSetCountry
}) => (
    <Tabs
        activeKey={galleryTab}
        onChange={setGalleryTab}
        size="small"
        items={[
            {
                key: 'backdesign',
                label: 'Back Design',
                children: designsLoading ? <Spin /> :
                    backDesigns.length === 0
                        ? <Empty description="No approved back designs available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        : <Row gutter={[8, 8]}>
                            {backDesigns.map(d => (
                                <Col span={12} key={d.id}>
                                    <Card
                                        hoverable
                                        onClick={() => onSelectDesign(d)}
                                        style={{ border: selectedDesignId === d.id ? '2px solid #00b96b' : '1px solid #f0f0f0' }}
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
                label: 'Country Logos',
                children: (
                    <div>
                        {libraryLoading ? <Spin /> :
                            libraryDesigns.length === 0
                                ? <Empty description="No library designs for your class country" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                : <Row gutter={[8, 8]}>
                                    {libraryDesigns.map(d => (
                                        <Col span={12} key={d.id}>
                                            <Card
                                                hoverable
                                                onClick={() => onSelectDesign(d)}
                                                style={{ border: selectedDesignId === d.id ? '2px solid #00b96b' : '1px solid #f0f0f0' }}
                                                bodyStyle={{ padding: 8 }}
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
                        }
                    </div>
                )
            }
        ]}
    />
);

export default DesignGallery;
