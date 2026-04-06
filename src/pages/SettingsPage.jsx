import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Form, Input, Switch, Button,
    message, Spin, InputNumber, Row, Col
} from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '../api/index';

const { Title, Text } = Typography;

const SettingsPage = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/settings');
            const data = res.data.data || {};
            form.setFieldsValue({
                handling_fee: parseFloat(data.handling_fee) || 0,
                handling_fee_enabled: data.handling_fee_enabled === 'true',
                handling_fee_threshold: parseFloat(data.handling_fee_threshold) || 0,
                handling_fee_extra: parseFloat(data.handling_fee_extra) || 0,
                vat_percentage: parseFloat(data.vat_percentage) || 0,
                'price_T-SHIRT': parseFloat(data['price_T-SHIRT']) || 0,
                'price_SWEATSHIRT': parseFloat(data['price_SWEATSHIRT']) || 0,
                'price_HOODIE': parseFloat(data['price_HOODIE']) || 0,
                'price_ZIPPERHOODIE': parseFloat(data['price_ZIPPERHOODIE']) || 0,
                'price_SWEATPANTS': parseFloat(data['price_SWEATPANTS']) || 0,
                'price_SHORTS': parseFloat(data['price_SHORTS']) || 0,
            });
        } catch { message.error('Failed to load settings'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSettings(); }, []);

    const handleSave = async (values) => {
        setSaving(true);
        try {
            const settings = Object.entries(values)
                .filter(([, value]) => value !== undefined && value !== null)
                .map(([key, value]) => ({
                    key,
                    value: typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
                }));
            await api.put('/admin/settings', { settings });
            message.success('Settings saved successfully');
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to save settings');
        } finally { setSaving(false); }
    };

    if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <SettingOutlined style={{ marginRight: 8 }} />
                    Settings
                </Title>
                <Text type="secondary">Configure system-wide settings</Text>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave}>
                {/* Pricing */}
                <Card className="glass-card" style={{ border: 'none', marginBottom: 24 }} title="Pricing & Fees">
                    <Row gutter={[16, 0]} align="bottom">

                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="handling_fee" label="Base Handling Fee"
                                tooltip="Fixed fee split equally among all students in the class">
                                <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter="DKK" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="handling_fee_threshold" label="Threshold"
                                tooltip="If total ordered garments exceed this, extra fee is added">
                                <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter="items" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="handling_fee_extra" label="Extra Fee above threshold"
                                tooltip="Added to base fee when garment count exceeds threshold">
                                <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter="DKK" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="vat_percentage" label="VAT Percentage"
                                tooltip="VAT applied to orders">
                                <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} addonAfter="%" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="handling_fee_enabled" label="Enable Handling Fee" valuePropName="checked">
                                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                            </Form.Item>
                        </Col>
                    </Row>

                </Card>

                {/* Garment Prices */}
                <Card className="glass-card" style={{ border: 'none', marginBottom: 24 }} title="Garment Prices (DKK)">
                    <Row gutter={[16, 0]}>
                        {[
                            { key: 'price_T-SHIRT', label: 'T-Shirt' },
                            { key: 'price_SWEATSHIRT', label: 'Sweatshirt' },
                            { key: 'price_HOODIE', label: 'Hoodie' },
                            { key: 'price_ZIPPERHOODIE', label: 'Zipper Hoodie' },
                            { key: 'price_SWEATPANTS', label: 'Sweatpants' },
                            { key: 'price_SHORTS', label: 'Shorts' },
                        ].map(item => (
                            <Col xs={24} sm={12} md={8} key={item.key}>
                                <Form.Item name={item.key} label={item.label}>
                                    <InputNumber min={0} step={1} style={{ width: '100%' }} addonAfter="DKK" />
                                </Form.Item>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
                    Save Settings
                </Button>
            </Form>
        </div>
    );
};

export default SettingsPage;
