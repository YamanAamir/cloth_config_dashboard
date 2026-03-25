import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Layout, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { setUserPassword } from '../api/api'; // API call

const { Title } = Typography;

const ResetPasswordPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [oldPassword, setOldPassword] = useState(null);
    const [tokenError, setTokenError] = useState(false);
    const [form] = Form.useForm();

    // Extract old password or token from URL
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const rawQuery = location.search.replace(/^\?/, '');
        const token = queryParams.get('token') || rawQuery; // support both ?token=xxx or ?xxx

        if (!token) {
            setTokenError(true);
            setOldPassword(null);
            return;
        }

        try {
            const decoded = atob(token); // decode from base64
            setOldPassword(decoded);
            setTokenError(false);
        } catch (error) {
            console.error('Failed to decode token', error);
            setTokenError(true);
            setOldPassword(null);
        }
    }, [location.search]);

    const onFinish = async (values) => {
        if (!oldPassword) return; // oldPassword here is actually the decoded token

        setLoading(true);
        try {
            await setUserPassword({
                token: location.search.replace(/^\?/, ''), // send the raw token from URL
                newPassword: values.newPassword
            });

            message.success('Password set successfully! Please login with your new password.');
            navigate('/login');
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to set password');
        } finally {
            setLoading(false);
        }
    };


    // Invalid token
    if (tokenError) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
                <Card style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 16 }}>Set Password</Title>
                    <Alert type="error" showIcon message="Invalid or expired link" />
                    <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/login')}>
                        Go to Login
                    </Button>
                </Card>
            </Layout>
        );
    }

    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
            <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
                <Card style={{ border: 'none', textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 16 }}>Set Your Password</Title>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                        Enter a new password for your account
                    </Typography.Text>

                    <Form form={form} layout="vertical" onFinish={onFinish} size="large">
                        <Form.Item
                            name="newPassword"
                            rules={[
                                { required: true, message: 'Please enter a new password' },
                                { min: 6, message: 'Password must be at least 6 characters' }
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="New Password" />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            hasFeedback
                            rules={[
                                { required: true, message: 'Please confirm your password' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Passwords do not match'));
                                    }
                                })
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Confirm New Password" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" block loading={loading}>
                                Set Password
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        </Layout>
    );
};

export default ResetPasswordPage;
