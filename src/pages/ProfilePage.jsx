import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, message, Avatar, Tag, Divider, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/index';

const { Title, Text } = Typography;

const ProfilePage = () => {
    const { user } = useAuth();
    const [passwordForm] = Form.useForm();
    const [changingPassword, setChangingPassword] = useState(false);

    const handleChangePassword = async (values) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('Passwords do not match');
            return;
        }
        setChangingPassword(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            message.success('Password changed successfully');
            passwordForm.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const roleColor = {
        admin: 'red',
        server_owner: 'purple',
        class_representative: 'blue',
        student: 'green',
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Profile</Title>
                <Text type="secondary">Your account information</Text>
            </div>

            <Row gutter={[24, 24]}>
                {/* Account Info */}
                <Col xs={24} md={12}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Avatar
                                size={80}
                                style={{ backgroundColor: '#00b96b', fontSize: 32, marginBottom: 12 }}
                                icon={<UserOutlined />}
                            />
                            <Title level={4} style={{ margin: 0 }}>{user?.name}</Title>
                            <Tag color={roleColor[user?.role] || 'default'} style={{ marginTop: 8 }}>
                                {user?.role?.replace(/_/g, ' ').toUpperCase()}
                            </Tag>
                        </div>

                        <Divider />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <MailOutlined style={{ color: '#00b96b' }} />
                                    <Text>{user?.email}</Text>
                                </div>
                            </div>
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>Role</Text>
                                <div style={{ marginTop: 4 }}>
                                    <Text>{user?.role?.replace(/_/g, ' ')}</Text>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Change Password */}
                <Col xs={24} md={12}>
                    <Card className="glass-card" style={{ border: 'none' }} title="Change Password">
                        <Form
                            form={passwordForm}
                            layout="vertical"
                            onFinish={handleChangePassword}
                        >
                            <Form.Item
                                name="currentPassword"
                                label="Current Password"
                                rules={[{ required: true, message: 'Enter current password' }]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="Current password" />
                            </Form.Item>

                            <Form.Item
                                name="newPassword"
                                label="New Password"
                                rules={[
                                    { required: true, message: 'Enter new password' },
                                    { min: 6, message: 'At least 6 characters' }
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="New password" />
                            </Form.Item>

                            <Form.Item
                                name="confirmPassword"
                                label="Confirm New Password"
                                rules={[{ required: true, message: 'Confirm your password' }]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={changingPassword}
                                block
                            >
                                Update Password
                            </Button>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ProfilePage;
