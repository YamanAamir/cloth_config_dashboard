import React from 'react';
import { Card, Row, Col, Typography, Tag, Spin, Empty, Space } from 'antd';
import { CalendarOutlined, LockOutlined, UnlockOutlined, RightOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ClassList = ({ classes, loading, selectedId, onSelect }) => {
    if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;
    if (!classes.length) return <Empty description="No classes for this school" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    return (
        <Row gutter={[12, 12]}>
            {classes.map(cls => {
                const deadlinePast = cls.change_deadline && new Date() > new Date(cls.change_deadline);
                return (
                    <Col xs={24} sm={12} md={8} lg={6}   key={cls.id}>
                        <Card
                            hoverable
                            onClick={() => onSelect(cls)}
                            style={{
                                border: selectedId === cls.id ? '2px solid #00b96b' : '1px solid #f0f0f0',
                                background: selectedId === cls.id ? '#f0fff8' : '#fff',
                                cursor: 'pointer'
                            }}
                            bodyStyle={{ padding: 14 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{cls.name}</Text>
                                    <Space size={4} wrap>
                                        <Tag color="cyan" icon={<CalendarOutlined />}>{cls.graduation_year}</Tag>
                                        {cls.order_locked
                                            ? <Tag color="error" icon={<LockOutlined />}>Locked</Tag>
                                            : <Tag color="success" icon={<UnlockOutlined />}>Open</Tag>
                                        }
                                        {cls.change_deadline && (
                                            <Tag color={deadlinePast ? 'volcano' : 'blue'} style={{ fontSize: 10 }}>
                                                {new Date(cls.change_deadline).toLocaleDateString()}
                                            </Tag>
                                        )}
                                    </Space>
                                    {cls.users?.length > 0 && (
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                            Rep: {cls.users[0].name}
                                        </Text>
                                    )}
                                </div>
                                <RightOutlined style={{ color: selectedId === cls.id ? '#00b96b' : '#d9d9d9' }} />
                            </div>
                        </Card>
                    </Col>
                );
            })}
        </Row>
    );
};

export default ClassList;
