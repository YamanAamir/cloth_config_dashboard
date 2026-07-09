import { useState, useEffect } from 'react';
import {
    Card, Tag, Typography, Form, Input, Switch, Button,
    message, Spin, InputNumber, Row, Col, Table, Space, Popconfirm, Modal, Select
} from 'antd';
import { SaveOutlined, SettingOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../api/index';
import { Status } from '../utils/constants';
import { getEducationPrograms, createEducationProgram, updateEducationProgram, deleteEducationProgram } from '../api/api';
import {
    getShippingRates, createShippingRate,
    updateShippingRate, deleteShippingRate, toggleShippingRateStatus
} from '../api/api';

const { Title, Text } = Typography;

const SettingsPage = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    // Shipping rates state
    const [shippingRates, setShippingRates] = useState([]);
    const [shippingLoading, setShippingLoading] = useState(false);
    const [shippingModalOpen, setShippingModalOpen] = useState(false);
    const [editingShipping, setEditingShipping] = useState(null);
    const [shippingForm] = Form.useForm();
    const [savingShipping, setSavingShipping] = useState(false);
    // ── Fetch general settings ────────────────────────────────────────────────
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
                max_chars_cloth_text: parseInt(data.max_chars_cloth_text) || 20,
            });
        } catch { message.error('Failed to load settings'); }
        finally { setLoading(false); }
    };

    // ── Fetch shipping rates from DB ──────────────────────────────────────────
    const fetchShippingRates = async () => {
        setShippingLoading(true);
        try {
            const res = await getShippingRates();
            // handle both { data: [...] } and { data: { data: [...] } }
            const rates = Array.isArray(res.data?.data) ? res.data.data
                : Array.isArray(res.data) ? res.data
                    : [];
            setShippingRates(rates);
        } catch { message.error('Failed to load shipping rates'); }
        finally { setShippingLoading(false); }
    };

    useEffect(() => {
        fetchSettings();
        fetchShippingRates();
    }, []);

    // ── Save general settings ─────────────────────────────────────────────────
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

    // ── Shipping CRUD ─────────────────────────────────────────────────────────
    const openAddShipping = () => {
        setEditingShipping(null);
        shippingForm.resetFields();
        setShippingModalOpen(true);
    };

    const openEditShipping = (record) => {
        setEditingShipping(record);
        shippingForm.setFieldsValue({
            country_name: record.country_name,
            country_code: record.country_code || '',
            regular_delivery_rate: parseFloat(record.regular_delivery_rate),
            express_delivery_rate: parseFloat(record.express_delivery_rate),
            description: record.description || '',
        });
        setShippingModalOpen(true);
    };

    const handleDeleteShipping = async (id) => {
        try {
            await deleteShippingRate(id);
            message.success('Country removed');
            fetchShippingRates();
        } catch (err) {
            message.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleToggleShipping = async (id) => {
        try {
            await toggleShippingRateStatus(id);
            fetchShippingRates();
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to toggle status');
        }
    };

    const handleSaveShipping = async (values) => {
        setSavingShipping(true);
        try {
            const payload = {
                country_name: values.country_name,
                country_code: values.country_code || null,
                regular_delivery_rate: values.regular_delivery_rate,
                express_delivery_rate: values.express_delivery_rate,
                description: values.description || null,
            };
            if (editingShipping) {
                await updateShippingRate(editingShipping.id, payload);
                message.success('Shipping rate updated');
            } else {
                await createShippingRate(payload);
                message.success('Country added');
            }
            setShippingModalOpen(false);
            shippingForm.resetFields();
            fetchShippingRates();
        } catch (err) {
            message.error(err.response?.data?.message || 'Save failed');
        } finally {
            setSavingShipping(false);
        }
    };

    const shippingColumns = [
        {
            title: 'Country',
            key: 'country',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{r.country_name}</Text>
                    {r.country_code && <Text type="secondary" style={{ fontSize: 11 }}>{r.country_code}</Text>}
                </Space>
            ),
        },
        {
            title: 'Regular Delivery',
            dataIndex: 'regular_delivery_rate',
            key: 'regular_delivery_rate',
            render: v => <Text>{parseFloat(v).toFixed(2)} DKK</Text>,
        },
        {
            title: 'Express Priority',
            dataIndex: 'express_delivery_rate',
            key: 'express_delivery_rate',
            render: v => <Text>{parseFloat(v).toFixed(2)} DKK</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => (
                <Switch
                    checked={status === 0}
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                    onChange={() => handleToggleShipping(record.id)}
                />
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button
                        type="text" size="small"
                        icon={<EditOutlined style={{ color: '#00b96b' }} />}
                        onClick={() => openEditShipping(record)}
                    />
                    <Popconfirm
                        title="Remove this country?"
                        onConfirm={() => handleDeleteShipping(record.id)}
                        okText="Yes" cancelText="No" okType="danger"
                    >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ── Education CRUD ────────────────────────────────────────────────────────
    const [educationPrograms, setEducationPrograms] = useState([]);
    const [educationLoading, setEducationLoading] = useState(false);
    const [educationModalOpen, setEducationModalOpen] = useState(false);
    const [editingEducation, setEditingEducation] = useState(null);
    const [educationForm] = Form.useForm();
    const [savingEducation, setSavingEducation] = useState(false);

    const fetchEducationPrograms = async () => {
        setEducationLoading(true);
        try {
            const res = await getEducationPrograms();
            const data = res.data?.data?.data || res.data?.data || [];
            setEducationPrograms(data);
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to load education programs');
        } finally {
            setEducationLoading(false);
        }
    };

    const openAddEducation = () => {
        setEditingEducation(null);
        educationForm.resetFields();
        setEducationModalOpen(true);
    };

    const openEditEducation = (record) => {
        setEditingEducation(record);

        educationForm.setFieldsValue({
            name: record.name,
        });

        setEducationModalOpen(true);
    };

    const handleDeleteEducation = async (id) => {
        try {
            await deleteEducationProgram(id);
            message.success('Program deleted');
            fetchEducationPrograms();
        } catch (err) {
            message.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleToggleEducation = async (record) => {
        try {
            await updateEducationProgram(record.id, { status: record.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE });
            message.success('Status updated');
            fetchEducationPrograms();
        } catch (err) {
            message.error('Status update failed');
        }
    };

    const handleSaveEducation = async (values) => {
        setSavingEducation(true);

        try {
            const payload = {
                name: values.name,
            };

            // if (editingEducation) {
            //     payload.status = editingEducation.status;
            // }

            if (editingEducation) {
                await updateEducationProgram(editingEducation.id, payload);
                message.success("Updated successfully");
            } else {
                await createEducationProgram(payload);
                message.success("Created successfully");
            }

            setEducationModalOpen(false);
            educationForm.resetFields();
            fetchEducationPrograms();
        } catch (err) {
            message.error(err.response?.data?.message || "Save failed");
        } finally {
            setSavingEducation(false);
        }
    };

    const educationColumns = [
        {
            title: 'Program Name',
            dataIndex: 'name',
            key: 'name',
        },
        // {
        //     title: 'Status',
        //     dataIndex: 'status',
        //     key: 'status',
        //     render: (status, record) => (
        //         <Switch
        //             checked={status === 0}
        //             checkedChildren="Active"
        //             unCheckedChildren="Inactive"
        //             onChange={() => handleToggleEducation(record)}
        //         />
        //     ),
        // },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#00b96b' }} />}
                        onClick={() => openEditEducation(record)}
                    />
                    <Popconfirm
                        title="Delete?"
                        onConfirm={() => handleDeleteEducation(record.id)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Fetch education programs on component mount
    useEffect(() => {
        fetchEducationPrograms();
    }, []);


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
                {/* Pricing & Fees */}
                <Card className="glass-card" style={{ border: 'none', marginBottom: 24 }} title="Pricing & Fees">
                    <Row gutter={[16, 0]} align="bottom">
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="handling_fee" label="Base Handling Fee"
                                tooltip="Fixed fee split equally among all students in the class">
                                <InputNumber min={0} step={1} style={{ width: '100%' }} suffix="DKK" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="handling_fee_threshold" label="Threshold"
                                tooltip="If total ordered garments exceed this, extra fee is added">
                                <InputNumber min={0} step={1} style={{ width: '100%' }} suffix="items" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="handling_fee_extra" label="Extra Fee above threshold"
                                tooltip="Added to base fee when garment count exceeds threshold">
                                <InputNumber min={0} step={1} style={{ width: '100%' }} suffix="DKK" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item name="vat_percentage" label="VAT Percentage"
                                tooltip="VAT applied to orders">
                                <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} suffix="%" />
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
                                    <InputNumber min={0} step={1} style={{ width: '100%' }} suffix="DKK" />
                                </Form.Item>
                            </Col>
                        ))}
                    </Row>
                </Card>

                {/* Cloth Text Length Limit */}
                <Card className="glass-card" style={{ border: 'none', marginBottom: 24 }} title="Cloth Text Length Limit">
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                        Maximum number of characters allowed for any printed text on garments.
                    </Text>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} sm={12} md={6}>
                            <Form.Item
                                name="max_chars_cloth_text"
                                label="Max Characters"
                                tooltip="Maximum characters allowed for cloth text input"
                                rules={[{ type: 'number', min: 1, max: 15, message: 'Maximum allowed value is 15 characters' }]}
                            >
                                <InputNumber min={1} step={1} style={{ width: '100%' }} suffix="chars" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
                    Save Settings
                </Button>
            </Form>

            {/* Shipping Rates — separate from main form, uses its own API */}
            <Card
                className="glass-card"
                style={{ border: 'none', marginTop: 24 }}
                title="Shipping Rates"
                extra={
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddShipping}>
                        Add Country
                    </Button>
                }
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                    Delivery countries and their rates. Click the status tag to activate/deactivate.
                </Text>
                <Table
                    dataSource={shippingRates}
                    columns={shippingColumns}
                    rowKey="id"
                    loading={shippingLoading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'No delivery countries added yet' }}
                />
            </Card>

            {/* Add / Edit Shipping Modal */}
            <Modal
                title={editingShipping ? 'Edit Shipping Rate' : 'Add Delivery Country'}
                open={shippingModalOpen}
                onCancel={() => { setShippingModalOpen(false); shippingForm.resetFields(); }}
                footer={null}
                destroyOnHidden
            >
                <Form form={shippingForm} layout="vertical" onFinish={handleSaveShipping} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col xs={24} md={16}>
                            <Form.Item name="country_name" label="Country Name"
                                rules={[{ required: true, message: 'Enter country name' }]}>
                                <Input placeholder="e.g. Denmark" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="country_code" label="Country Code">
                                <Input placeholder="e.g. DK" maxLength={10} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="regular_delivery_rate" label="Regular Delivery (DKK)"
                                tooltip="Estimated 6 weeks"
                                rules={[{ required: true, message: 'Enter rate' }]}>
                                <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="express_delivery_rate" label="Express Priority (DKK)"
                                tooltip="Estimated 3 weeks"
                                rules={[{ required: true, message: 'Enter rate' }]}>
                                <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <Form.Item name="description" label="Description (optional)">
                                <Input placeholder="e.g. Free shipping over 500 DKK" />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                                <Space>
                                    <Button onClick={() => setShippingModalOpen(false)}>Cancel</Button>
                                    <Button type="primary" htmlType="submit" loading={savingShipping}>
                                        {editingShipping ? 'Update' : 'Add'}
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
            {/* Education Programs */}
            <Card className="glass-card" style={{ border: 'none', marginTop: 24 }} title="Education Programs"
                extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddEducation}>Add Program</Button>}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                    Manage education programs and their types.
                </Text>
                <Table
                    dataSource={educationPrograms}
                    columns={educationColumns}
                    rowKey="id"
                    loading={educationLoading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'No education programs added yet' }}
                />
            </Card>

            {/* Education Modal */}
            <Modal
                title={editingEducation ? 'Edit Education Program' : 'Add Education Program'}
                open={educationModalOpen}
                onCancel={() => { setEducationModalOpen(false); educationForm.resetFields(); }}
                footer={null}
                destroyOnHide
            >
                <Form form={educationForm} layout="vertical" onFinish={handleSaveEducation}>

                    <Form.Item
                        name="name"
                        label="Program Name"
                        rules={[
                            {
                                required: true,
                                message: "Enter program name",
                            },
                        ]}
                    >
                        <Input placeholder="Enter program name" />
                    </Form.Item>

                    <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setEducationModalOpen(false)}>
                                Cancel
                            </Button>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={savingEducation}
                            >
                                {editingEducation ? "Update" : "Add"}
                            </Button>
                        </Space>
                    </Form.Item>

                </Form>
            </Modal>
        </div>
    );
};

export default SettingsPage;
