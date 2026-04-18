import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Input, Button, message, Space, Typography, Divider, Tag, Select } from 'antd';
import { SaveOutlined, MailOutlined, BellOutlined } from '@ant-design/icons';
import { getNotificationSettings, updateNotificationSettings, testNotificationEmail } from '../api/api';

const { Title, Text } = Typography;

const NotificationSettingsPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [settings, setSettings] = useState({
        emailNotifications: true,
        logoUploadNotifications: true,
        backDesignUploadNotifications: true,
        adminEmails: [],
        instantNotifications: true,
        dailyDigest: false
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await getNotificationSettings();
            setSettings(response.data);
            form.setFieldsValue(response.data);
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        }
    };

    const handleSave = async (values) => {
        setLoading(true);
        try {
            await updateNotificationSettings(values);
            setSettings(values);
            message.success('Notification settings saved successfully');
        } catch (error) {
            message.error('Failed to save notification settings');
        } finally {
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        const emails = form.getFieldValue('adminEmails') || [];
        if (emails.length === 0) {
            message.warning('Please add at least one admin email to test');
            return;
        }

        setTestLoading(true);
        try {
            await testNotificationEmail(emails[0]);
            message.success(`Test email sent to ${emails[0]}`);
        } catch (error) {
            message.error('Failed to send test email');
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <Title level={2}>
                <BellOutlined /> Notification Settings
            </Title>
            <Text type="secondary">
                Configure how you want to be notified about logo and design uploads
            </Text>

            <Card style={{ marginTop: '24px' }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    initialValues={settings}
                >
                    <Title level={4}>Email Notifications</Title>
                    
                    <Form.Item
                        name="emailNotifications"
                        valuePropName="checked"
                    >
                        <Switch 
                            checkedChildren="Enabled" 
                            unCheckedChildren="Disabled"
                        />
                        <Text style={{ marginLeft: '12px' }}>
                            Enable email notifications
                        </Text>
                    </Form.Item>

                    <Form.Item
                        name="adminEmails"
                        label="Admin Email Addresses"
                        rules={[
                            { required: true, message: 'Please add at least one admin email' }
                        ]}
                    >
                        <Select
                            mode="tags"
                            placeholder="Enter admin email addresses"
                            style={{ width: '100%' }}
                            tokenSeparators={[',']}
                        />
                    </Form.Item>

                    <Divider />

                    <Title level={4}>Upload Notifications</Title>
                    
                    <Form.Item
                        name="logoUploadNotifications"
                        valuePropName="checked"
                    >
                        <Switch 
                            checkedChildren="On" 
                            unCheckedChildren="Off"
                        />
                        <Text style={{ marginLeft: '12px' }}>
                            Notify when logos are uploaded
                        </Text>
                    </Form.Item>

                    <Form.Item
                        name="backDesignUploadNotifications"
                        valuePropName="checked"
                    >
                        <Switch 
                            checkedChildren="On" 
                            unCheckedChildren="Off"
                        />
                        <Text style={{ marginLeft: '12px' }}>
                            Notify when back designs are uploaded
                        </Text>
                    </Form.Item>

                    <Divider />

                    <Title level={4}>Notification Frequency</Title>
                    
                    <Form.Item
                        name="instantNotifications"
                        valuePropName="checked"
                    >
                        <Switch 
                            checkedChildren="On" 
                            unCheckedChildren="Off"
                        />
                        <Text style={{ marginLeft: '12px' }}>
                            Instant notifications <Tag color="green">Recommended</Tag>
                        </Text>
                    </Form.Item>

                    <Form.Item
                        name="dailyDigest"
                        valuePropName="checked"
                    >
                        <Switch 
                            checkedChildren="On" 
                            unCheckedChildren="Off"
                        />
                        <Text style={{ marginLeft: '12px' }}>
                            Daily digest email
                        </Text>
                    </Form.Item>

                    <Form.Item style={{ marginTop: '32px' }}>
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={loading}
                                icon={<SaveOutlined />}
                            >
                                Save Settings
                            </Button>
                            <Button 
                                onClick={handleTestEmail}
                                loading={testLoading}
                                icon={<MailOutlined />}
                            >
                                Send Test Email
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default NotificationSettingsPage;