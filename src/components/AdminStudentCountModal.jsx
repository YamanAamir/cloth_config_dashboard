import React, { useState, useEffect } from 'react';
import { Modal, InputNumber, message, Statistic, Row, Col, Progress, Typography, Space } from 'antd';
import { TeamOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { setExpectedStudentCount, getClassStudentCount } from '../api/api';

const { Text } = Typography;

const AdminStudentCountModal = ({ open, onCancel, classId, className }) => {
    const [studentCount, setStudentCount] = useState(null);
    const [expectedCount, setExpectedCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);

    const fetchStudentCount = async () => {
        if (!classId) return;
        
        setLoading(true);
        try {
            const response = await getClassStudentCount(classId);
            setStudentCount(response.data.data);
            setExpectedCount(response.data.data.expected_students || 0);
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

        setUpdating(true);
        try {
            await setExpectedStudentCount(classId, { expected_students: expectedCount });
            message.success('Expected student count updated successfully');
            onCancel();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to update expected student count');
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => {
        if (open && classId) {
            fetchStudentCount();
        }
    }, [open, classId]);

    if (!studentCount) return null;

    const { expected_students, registered_students, completion_percentage } = studentCount;
    const hasExpectedCount = expected_students && expected_students > 0;

    return (
        <Modal
            title={`Student Count - ${className}`}
            open={open}
            onOk={handleUpdateExpectedCount}
            onCancel={onCancel}
            confirmLoading={updating}
            okText="Update Expected Count"
            width={500}
        >
            <div style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <div style={{ textAlign: 'center', padding: '16px', background: '#f6ffed', borderRadius: '8px' }}>
                            <TeamOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
                            <Statistic
                                title="Registered Students"
                                value={registered_students || 0}
                                valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                            />
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ textAlign: 'center', padding: '16px', background: '#e6f7ff', borderRadius: '8px' }}>
                            <TeamOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
                            <Statistic
                                title="Expected Students"
                                value={expected_students || 'Not set'}
                                valueStyle={{ 
                                    color: hasExpectedCount ? '#1890ff' : '#d9d9d9', 
                                    fontSize: '20px' 
                                }}
                            />
                        </div>
                    </Col>
                </Row>

                {hasExpectedCount && (
                    <div style={{ marginTop: 16, padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong>Registration Progress</Text>
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
            </div>

            <div>
                <Text strong>Set Expected Student Count:</Text>
                <InputNumber
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Enter expected number of students"
                    value={expectedCount}
                    onChange={setExpectedCount}
                    min={1}
                    max={1000}
                />
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
                    This helps track progress toward graduation cap targets
                </Text>
            </div>
        </Modal>
    );
};

export default AdminStudentCountModal;