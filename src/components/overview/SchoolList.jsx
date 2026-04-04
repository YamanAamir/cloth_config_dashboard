import React from 'react';
import { Card, Row, Col, Typography, Tag, Spin, Empty, Badge } from 'antd';
import { BankOutlined, TeamOutlined, RightOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const SchoolList = ({ schools, loading, selectedId, onSelect }) => {
    if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;
    if (!schools.length) return <Empty description="No schools found" />;

    return (
        <Row gutter={[12, 12]}>
            {schools.map(school => (
                <Col xs={24} sm={12} md={8} lg={6} key={school.id}>
                    <Card
                        hoverable
                        onClick={() => onSelect(school)}
                        style={{
                            border: selectedId === school.id ? '2px solid #00b96b' : '1px solid #f0f0f0',
                            background: selectedId === school.id ? '#f0fff8' : '#fff',
                            cursor: 'pointer'
                        }}
                        bodyStyle={{ padding: 16 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <BankOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                                    <Text strong style={{ fontSize: 14 }}>{school.name}</Text>
                                </div>
                                <Tag color="blue" style={{ marginBottom: 6 }}>{school.education_type}</Tag>
                                {/* <div style={{ display: 'flex', gap: 12 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <TeamOutlined style={{ marginRight: 4 }} />
                                        {school.class_count || 0} classes
                                    </Text>
                                </div> */}
                            </div>
                            <RightOutlined style={{ color: selectedId === school.id ? '#00b96b' : '#d9d9d9', marginTop: 4 }} />
                        </div>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default SchoolList;
