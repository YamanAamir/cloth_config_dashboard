import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Button, Modal, InputNumber, message, Progress, Space, Typography } from 'antd';
import { TeamOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getClassRepStudentCount, setClassRepExpectedStudentCount } from '../api/api';

const { Text } = Typography;

const StudentCountCard = ({ classId }) => {
    const [studentCount, setStudentCount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [expectedCount, setExpectedCount] = useState(0);
    const [updating, setUpdating] = useState(false);

    const fetchStudentCount = async () => {
        if (!classId) return;
        
        setLoading(true);
        try {
            const response = await getClassRepStudentCount(classId);
            setStudentCount(response.data.data);
        } catch (error) {
            console.error('Failed to fetch student count:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateExpectedCount = async () => {
        if (!expectedCount || expectedCount < 1) {
            message.error('Please enter a valid number of expected students');
            return;
        }
        if (!classId) {
            message.error('Class ID not found');
            return;
        }

        setUpdating(true);
        try {
            await setClassRepExpectedStudentCount(classId, { expected_students: expectedCount });
            message.success('Expected student count updated successfully');
            setModalOpen(false);
            fetchStudentCount();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to update expected student count');
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => {
        if (classId) {
            fetchStudentCount();
        }
    }, [classId]);

    useEffect(() => {
        if (modalOpen && studentCount) {
            setExpectedCount(studentCount.expected_students || 0);
        }
    }, [modalOpen, studentCount]);

    if (!studentCount) return null;

    const { expected_students, registered_students, completion_percentage } = studentCount;
    const hasExpectedCount = expected_students && expected_students > 0;

    return (
        <>
            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            background: '#52c41a15',
                            padding: '8px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <TeamOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                        </div>
                        <div>
                            <Text strong style={{ fontSize: '16px', color: '#262626' }}>Student Count</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>Registration Progress</Text>
                        </div>
                    </div>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => setModalOpen(true)}
                        size="small"
                    />
                </div>

                <Row gutter={16}>
                    <Col span={12}>
                        <Statistic
                            title="Registered"
                            value={registered_students || 0}
                            valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
                        />
                    </Col>
                    <Col span={12}>
                        <Statistic
                            title="Expected"
                            value={expected_students || 'Not set'}
                            valueStyle={{ 
                                color: hasExpectedCount ? '#1890ff' : '#d9d9d9', 
                                fontSize: '24px', 
                                fontWeight: 'bold' 
                            }}
                        />
                    </Col>
                </Row>

                {hasExpectedCount && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong>Progress</Text>
                            <Text strong style={{ color: completion_percentage >= 100 ? '#52c41a' : '#1890ff' }}>
                                {Math.round(completion_percentage || 0)}%
                            </Text>
                        </div>
                        <Progress
                            percent={Math.round(completion_percentage || 0)}
                            strokeColor={completion_percentage >= 100 ? '#52c41a' : '#1890ff'}
                            showInfo={false}
                        />
                        {completion_percentage >= 100 && (
                            <div style={{ marginTop: 8, textAlign: 'center' }}>
                                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                                <Text style={{ color: '#52c41a', fontSize: '12px' }}>Target reached!</Text>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <Modal
                title="Set Expected Student Count"
                open={modalOpen}
                onOk={handleUpdateExpectedCount}
                onCancel={() => setModalOpen(false)}
                confirmLoading={updating}
                okText="Update"
            >
                <div style={{ marginBottom: 16 }}>
                    <Text>How many students do you expect in your class for graduation caps?</Text>
                </div>
                <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Enter expected number of students"
                    value={expectedCount}
                    onChange={setExpectedCount}
                    min={1}
                    max={1000}
                />
                <div style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        Currently registered: {registered_students || 0} students
                    </Text>
                </div>
            </Modal>
        </>
    );
};

export default StudentCountCard;