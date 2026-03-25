import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Layout, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/api';

const { Title } = Typography;

const RegisterPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [decodedData, setDecodedData] = useState(null);
    const [tokenError, setTokenError] = useState(false);
    const [form] = Form.useForm();

    // Extract and decode token from URL
    // useEffect(() => {
    //     const queryParams = new URLSearchParams(location.search);
    //     const token = queryParams.get('token');

    //     if (!token) {
    //         setTokenError(true);
    //         setDecodedData(null);
    //         return;
    //     }

    //     try {
    //         const jsonString = atob(token);
    //         const data = JSON.parse(jsonString);
    //         if (data.school_id != null && data.class_id != null) {
    //             setDecodedData({ ...data, token });
    //             setTokenError(false);
    //         } else {
    //             setTokenError(true);
    //             setDecodedData(null);
    //         }
    //     } catch (error) {
    //         console.error('Failed to decode token', error);
    //         setTokenError(true);
    //         setDecodedData(null);
    //     }
    // }, [location.search]);
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);

        // support both ?token=xxx and ?xxx
        const rawQuery = location.search.replace(/^\?/, '');
        const token = queryParams.get('token') || rawQuery;

        if (!token) {
            setTokenError(true);
            setDecodedData(null);
            return;
        }

        try {
            const jsonString = atob(token);
            const data = JSON.parse(jsonString);

            if (data.school_id != null && data.class_id != null) {
                setDecodedData({ ...data, token });
                setTokenError(false);
            } else {
                setTokenError(true);
                setDecodedData(null);
            }
        } catch (error) {
            console.error('Failed to decode token', error);
            setTokenError(true);
            setDecodedData(null);
        }
    }, [location.search]);

    const onFinish = async (values) => {
        if (!decodedData) return;
        setLoading(true);
        try {
            await registerUser({
                name: values.name,
                email: values.email,
                password: values.password,
                school_id: decodedData.school_id,
                class_id: decodedData.class_id,
                token: decodedData.token,
            });
            message.success('Registration successful! You can now log in.');
            navigate('/login');
        } catch (error) {
            message.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // No token or invalid token
    if (tokenError || (!decodedData && location.search)) {
        return (
            <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #00b96b 0%, #006d75 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="fade-in" style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>
                    <Card className="glass-card" style={{ border: 'none', textAlign: 'center' }}>
                        <Title level={2} style={{ marginBottom: 8, color: '#006d75' }}>Student Registration</Title>
                        <Alert
                            type="warning"
                            showIcon
                            message={!location.search ? 'No registration token' : 'Invalid registration link'}
                            description={
                                !location.search
                                    ? 'Get a registration link from your class representative to join your class.'
                                    : 'This link is invalid or expired. Ask your class rep for a new link.'
                            }
                            style={{ marginBottom: 24, textAlign: 'left' }}
                        />
                        <Button type="primary" block onClick={() => navigate('/login')}>
                            Go to Login
                        </Button>
                    </Card>
                </div>
            </Layout>
        );
    }

    // Still resolving token (initial load with token)
    if (location.search && decodedData === null && !tokenError) {
        return (
            <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #00b96b 0%, #006d75 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Card className="glass-card" style={{ border: 'none' }}>
                    <Typography.Text>Loading...</Typography.Text>
                </Card>
            </Layout>
        );
    }

    // Valid token: show registration form
    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #00b96b 0%, #006d75 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
                <Card className="glass-card" style={{ border: 'none', textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 8, color: '#006d75' }}>Join Your Class</Title>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                        Register as a student for your class
                    </Typography.Text>

                    <Form
                        form={form}
                        name="register"
                        layout="vertical"
                        onFinish={onFinish}
                        size="large"
                    >
                        <Form.Item
                            name="name"
                            rules={[{ required: true, message: 'Please enter your full name' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Full name" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Please enter your email' },
                                { type: 'email', message: 'Please enter a valid email' },
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                { required: true, message: 'Please enter a password' },
                                { min: 6, message: 'Password must be at least 6 characters' },
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block>
                                Register
                            </Button>
                        </Form.Item>
                    </Form>

                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Already have an account? <a href="/login">Log in</a>
                    </Typography.Text>
                </Card>
            </div>
        </Layout>
    );
};

export default RegisterPage;
