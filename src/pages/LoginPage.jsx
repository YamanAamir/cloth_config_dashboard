import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Layout } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/api';

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const { data } = await loginUser({ email: values.username, password: values.password });
            console.log(data);

            if (data.token) {
                const userObj = data.data.user || { name: 'Admin', email: values.username };
                login(userObj, data.token);
                message.success('Welcome back!');

                if (userObj.role === 'class_representative') {
                    navigate('/my-class');
                } else {
                    navigate('/');
                }
            } else {
                message.error('Invalid credentials');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #00b96b 0%, #006d75 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
                <Card className="glass-card" style={{ border: 'none', textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: 8, color: '#006d75' }}>ClothConfig Admin</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Sign in to manage your dashboard</Text>

                    <Form
                        name="login"
                        layout="vertical"
                        initialValues={{ remember: true }}
                        onFinish={onFinish}
                        size="large"
                    >
                        <Form.Item
                            name="username"
                            rules={[{ required: true, message: 'Please input your email!' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Email" defaultValue="" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Please input your password!' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Password" defaultValue="" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block>
                                Log in
                            </Button>
                        </Form.Item>
                    </Form>

                    <div style={{ marginTop: 16 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            &copy; 2024 ClothConfig. All rights reserved.
                        </Text>
                    </div>
                </Card>
            </div>
        </Layout>
    );
};

export default LoginPage;
