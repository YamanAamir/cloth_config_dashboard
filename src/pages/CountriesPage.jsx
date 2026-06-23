import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Space, Modal,
    Form, Input, message, Popconfirm, Upload, Image, Empty, Select, Tag,
    Switch, Checkbox
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined, GlobalOutlined } from '@ant-design/icons';
import {
    getAllCountries, createCountry, updateCountry, deleteCountry, permanentDeleteCountry,
    uploadLibraryDesign, getLibraryDesigns, deleteLibraryDesign, toggleCountryStatus, updateLibraryDesign
} from '../api/api';
import { getUploadsUrl, getBackDesignDisplayUrl } from '../utils/constants';

const { Title, Text } = Typography;

const CountriesPage = () => {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState(null);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({ current: 1, limit: 10, total: 0, totalPages: 1, search: '' });

    // Designs per country (keyed by country id)
    const [designsMap, setDesignsMap] = useState({});
    const [loadingDesigns, setLoadingDesigns] = useState({});
    const [expandedRows, setExpandedRows] = useState([]);
    const [uploadWhiteFile, setUploadWhiteFile] = useState(null);
    const [uploadWhitePreview, setUploadWhitePreview] = useState(null);

    const [uploadBlackFile, setUploadBlackFile] = useState(null);
    const [uploadBlackPreview, setUploadBlackPreview] = useState(null);

    const [adminForAllStudents, setAdminForAllStudents] = useState(false);
    // Upload modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadForm] = Form.useForm();

    // Per-design color editing
    const [updatingColorId, setUpdatingColorId] = useState(null);


    const fetchCountries = async () => {
        setLoading(true);
        try {
            const res = await getAllCountries({ page: pagination.current, limit: pagination.limit, search: pagination.search });
            const { total, page, limit, totalPages } = res.data.pagination || {};
            setCountries(res.data.data || []);
            setPagination(prev => ({ ...prev, total: total ?? 0, current: page ?? prev.current, limit: limit ?? prev.limit, totalPages: totalPages ?? 1 }));
        } catch { message.error('Failed to fetch countries'); }
        finally { setLoading(false); }
    };

    const fetchDesignsForCountry = async (countryId, forceRefresh = false) => {
        if (designsMap[countryId] && !forceRefresh) return; // already loaded and not forcing refresh
        setLoadingDesigns(prev => ({ ...prev, [countryId]: true }));
        try {
            const res = await getLibraryDesigns({ country_id: countryId });
            setDesignsMap(prev => ({ ...prev, [countryId]: res.data.data || [] }));
        } catch { message.error('Failed to fetch designs'); }
        finally { setLoadingDesigns(prev => ({ ...prev, [countryId]: false })); }
    };

    useEffect(() => {
        fetchCountries();
    }, [pagination.current, pagination.limit, pagination.search]);
    const handleSaveCountry = async (values) => {
        try {
            if (editingCountry) {
                await updateCountry(editingCountry.id, values);
                message.success('Country updated');
            } else {
                await createCountry(values);
                message.success('Country created');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingCountry(null);
            fetchCountries();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed');
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await toggleCountryStatus(id);
            message.success('Country status updated');
            fetchCountries();
        } catch (error) {
            message.error(error.response?.data?.message || 'Status update failed');
        }
    };

   

    const handlePermanentDelete = async (id, name) => {
        Modal.confirm({
            title: 'Permanently delete this country?',
            content: (
                <div>
                    <Typography.Text type="danger" strong>
                        This action cannot be undone!
                    </Typography.Text>
                    <br />
                    <Typography.Text>
                        This will permanently remove "{name}" and all associated data from the system.
                        This action is irreversible.
                    </Typography.Text>
                </div>
            ),
            okText: 'Permanently Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await permanentDeleteCountry(id);
                    message.success('Country permanently deleted');
                    fetchCountries();
                } catch (error) {
                    message.error(error.response?.data?.message || 'Permanent delete failed');
                }
            }
        });
    };

    const handleDeleteLibraryDesign = async (designId, designName, countryId) => {
        Modal.confirm({
            title: 'Delete this library design?',
            content: (
                <div>
                    <Typography.Text type="danger" strong>
                        This action cannot be undone!
                    </Typography.Text>
                    <br />
                    <Typography.Text>
                        This will permanently remove "{designName}" from the library.
                        This action is irreversible.
                    </Typography.Text>
                </div>
            ),
            okText: 'Delete Forever',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await deleteLibraryDesign(designId);
                    message.success('Library design deleted');

                    // Ensure the country row stays expanded
                    if (!expandedRows.includes(countryId)) {
                        setExpandedRows(prev => [...prev, countryId]);
                    }

                    // Force refetch the designs for this specific country
                    await fetchDesignsForCountry(countryId, true);

                } catch (error) {
                    message.error(error.response?.data?.message || 'Delete failed');
                }
            }
        });
    };


    const handleUploadDesign = async (values) => {
        if (!uploadWhiteFile) {
            message.error('Select the White design file');
            return;
        }

        if (!uploadBlackFile) {
            message.error('Select the Black design file');
            return;
        }
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('name', values.name);
            formData.append('country_id', values.country_id);

            // white version
            formData.append('design', uploadWhiteFile);
            formData.append('designColor', 'white');

            // black version
            formData.append('design_2', uploadBlackFile);
            formData.append('designColor_2', 'black');

            // optional flag
            formData.append('forAllStudents', adminForAllStudents ? 'true' : 'false');

            await uploadLibraryDesign(formData);

            message.success('Design uploaded');

            setUploadModalOpen(false);
            uploadForm.resetFields();

            setUploadWhiteFile(null);
            setUploadWhitePreview(null);
            setUploadBlackFile(null);
            setUploadBlackPreview(null);
            setAdminForAllStudents(false);

            // Ensure the country row stays expanded
            if (!expandedRows.includes(values.country_id)) {
                setExpandedRows(prev => [...prev, values.country_id]);
            }

            // Force refetch
            await fetchDesignsForCountry(values.country_id, true);

        } catch (error) {
            message.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateDesignColor = async (designId, newColor, countryId) => {
        setUpdatingColorId(designId);
        try {
            await updateLibraryDesign(designId, { designColor: newColor });
            message.success('Design color updated');
            // Update local state immediately without full refetch
            setDesignsMap(prev => ({
                ...prev,
                [countryId]: (prev[countryId] || []).map(d =>
                    d.id === designId ? { ...d, designColor: newColor } : d
                ),
            }));
        } catch (err) {
            message.error(err.response?.data?.message || 'Failed to update color');
        } finally {
            setUpdatingColorId(null);
        }
    };

    // Expanded row: show designs grid
    const expandedRowRender = (record) => {
        const designs = designsMap[record.id] || [];
        const isLoading = loadingDesigns[record.id];
        return (
            <div style={{ padding: '12px 24px', background: '#fafafa', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 13 }}>Library Designs — {record.name}</Text>
                    <Button size="small" type="primary" icon={<PlusOutlined />}
                        onClick={() => {
                            uploadForm.resetFields();
                            uploadForm.setFieldsValue({ country_id: record.id });

                            setUploadWhiteFile(null);
                            setUploadWhitePreview(null);
                            setUploadBlackFile(null);
                            setUploadBlackPreview(null);
                            setAdminForAllStudents(false);

                            setUploadModalOpen(true);
                        }}>
                        Upload Design
                    </Button>
                </div>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>Loading...</div>
                ) : designs.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No designs for this country" style={{ padding: 16 }} />
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {designs.map(d => (
                            <div key={d.id} style={{ width: 140, textAlign: 'center', position: 'relative' }}>
                                <div style={{ position: 'relative' }}>
                                    <Image
                                        src={getBackDesignDisplayUrl(d)}
                                        width={100} height={100}
                                        style={{ objectFit: 'contain', borderRadius: 6, border: '1px solid #f0f0f0', background: '#fff' }}
                                    />
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        style={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            background: 'rgba(255,255,255,0.9)',
                                            border: '1px solid #ff4d4f',
                                            borderRadius: 4,
                                            width: 24,
                                            height: 24,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onClick={() => handleDeleteLibraryDesign(d.id, d.name, record.id)}
                                    />
                                </div>
                                <Text ellipsis style={{ display: 'block', fontSize: 11, marginTop: 4 }}>{d.name}</Text>
                                {d.design_size && (
                                    <Tag color="blue" style={{ fontSize: 10, marginTop: 2 }}>{d.design_size}%</Tag>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const columns = [
        {
            title: 'Country',
            dataIndex: 'name',
            key: 'name',
            render: t => <Text strong>{t}</Text>
        },

        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            render: c => <Tag>{c}</Tag>
        },

        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (_, record) => (
                <Switch
                    checked={record.status === 0}
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                    onChange={() => handleToggleStatus(record.id)}
                />
            )
        },

        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space>

                    {/* Edit */}
                    <Button
                        type="text"
                        size="small"
                        icon={
                            <EditOutlined
                                style={{ color: '#00b96b' }}
                            />
                        }
                        onClick={() => {
                            setEditingCountry(record);
                            form.setFieldsValue(record);
                            setIsModalOpen(true);
                        }}
                    />

                    {/* Permanent Delete */}
                    <Popconfirm
                        title="Permanently delete this country?"
                        description="This action cannot be undone!"
                        onConfirm={() =>
                            handlePermanentDelete(
                                record.id,
                                record.name
                            )
                        }
                        okText="Delete Forever"
                        okType="danger"
                        cancelText="Cancel"
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>

                </Space>
            )
        }
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Study Trip Countries</Title>
                <Text type="secondary">Manage countries and their library designs — expand a row to view/upload designs</Text>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Countries</span>
                        <Space>
                            <Input.Search
                                placeholder="Search"
                                allowClear
                                style={{ width: 220 }}
                                onSearch={(v) => setPagination(prev => ({ ...prev, search: v, current: 1 }))}
                                onChange={(e) => { if (!e.target.value) setPagination(prev => ({ ...prev, search: '', current: 1 })); }}
                            />
                            <Button type="primary" icon={<PlusOutlined />} size="small"
                                onClick={() => { setEditingCountry(null); form.resetFields(); setIsModalOpen(true); }}>
                                Add Country
                            </Button>
                        </Space>
                    </div>
                }
            >
                <Table
                    columns={columns}
                    dataSource={countries}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    expandable={{
                        expandedRowRender,
                        expandedRowKeys: expandedRows,
                        onExpand: (expanded, record) => {
                            if (expanded) {
                                setExpandedRows(prev => [...prev, record.id]);
                                fetchDesignsForCountry(record.id);
                            } else {
                                setExpandedRows(prev => prev.filter(id => id !== record.id));
                            }
                        }
                    }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                        onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, limit: pageSize })),
                    }}
                />
            </Card>

            {/* Country Modal */}
            <Modal title={editingCountry ? 'Edit Country' : 'Add Country'} open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingCountry(null); }}
                footer={null} destroyOnHidden>
                <Form form={form} layout="vertical" onFinish={handleSaveCountry} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Country Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Italy" />
                    </Form.Item>
                    <Form.Item name="code" label="Country Code" rules={[{ required: true }]}>
                        <Input placeholder="e.g. IT" maxLength={5} />
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">{editingCountry ? 'Update' : 'Create'}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Upload Library Design"
                open={uploadModalOpen}
                onCancel={() => {
                    setUploadModalOpen(false);
                    uploadForm.resetFields();

                    setUploadWhiteFile(null);
                    setUploadWhitePreview(null);

                    setUploadBlackFile(null);
                    setUploadBlackPreview(null);

                    setAdminForAllStudents(false);
                }}
                footer={null}
                destroyOnHidden
                width={620}
            >
                <Form
                    form={uploadForm}
                    layout="vertical"
                    onFinish={handleUploadDesign}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="name"
                        label="Design Name"
                        rules={[{ required: true, message: "Please enter design name" }]}
                    >
                        <Input placeholder="e.g. Rome Colosseum" />
                    </Form.Item>

                    <Form.Item
                        name="country_id"
                        label="Country"
                        rules={[{ required: true, message: "Please select country" }]}
                    >
                        <Select
                            placeholder="Select country"
                            options={countries.map((c) => ({
                                value: c.id,
                                label: c.name,
                            }))}
                        />
                    </Form.Item>

                    {/* White design file */}
                    <Form.Item label="White Garment Design (Black print) *" required>
                        <Upload
                            beforeUpload={(file) => {
                                setUploadWhiteFile(file);
                                setUploadWhitePreview(URL.createObjectURL(file));
                                return false;
                            }}
                            showUploadList={false}
                            accept="image/*"
                        >
                            <Button
                                type="dashed"
                                icon={<InboxOutlined />}
                                block
                                style={{ height: 70 }}
                            >
                                {uploadWhiteFile
                                    ? `✓ ${uploadWhiteFile.name}`
                                    : "Click to select white version"}
                            </Button>
                        </Upload>

                        {uploadWhitePreview && (
                            <img
                                src={uploadWhitePreview}
                                alt="white preview"
                                style={{
                                    marginTop: 8,
                                    maxWidth: "100%",
                                    maxHeight: 120,
                                    objectFit: "contain",
                                    borderRadius: 6,
                                    background: "#fafafa",
                                    padding: 4,
                                }}
                            />
                        )}
                    </Form.Item>

                    {/* Black design file */}
                    <Form.Item label="Black Garment Design (White print) *" required>
                        <Upload
                            beforeUpload={(file) => {
                                setUploadBlackFile(file);
                                setUploadBlackPreview(URL.createObjectURL(file));
                                return false;
                            }}
                            showUploadList={false}
                            accept="image/*"
                        >
                            <Button
                                type="dashed"
                                icon={<InboxOutlined />}
                                block
                                style={{ height: 70 }}
                            >
                                {uploadBlackFile
                                    ? `✓ ${uploadBlackFile.name}`
                                    : "Click to select black version"}
                            </Button>
                        </Upload>

                        {uploadBlackPreview && (
                            <div
                                style={{
                                    marginTop: 8,
                                    background: "#1a1a1a",
                                    padding: 8,
                                    borderRadius: 6,
                                    textAlign: "center",
                                }}
                            >
                                <img
                                    src={uploadBlackPreview}
                                    alt="black preview"
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: 120,
                                        objectFit: "contain",
                                    }}
                                />
                            </div>
                        )}
                    </Form.Item>

                    <Form.Item label="For alle elever (Studietur bibliotek)">
                        <div
                            style={{
                                padding: "12px 16px",
                                borderRadius: 8,
                                border: adminForAllStudents
                                    ? "1.5px solid #7c3aed"
                                    : "1px solid #f0f0f0",
                                background: adminForAllStudents ? "#f5f0ff" : "#fafafa",
                                cursor: "pointer",
                            }}
                            onClick={() => setAdminForAllStudents((v) => !v)}
                        >
                            <Checkbox
                                checked={adminForAllStudents}
                                onChange={(e) => setAdminForAllStudents(e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Space size={6}>
                                    <GlobalOutlined style={{ color: "#7c3aed" }} />
                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                        For alle elever
                                    </Typography.Text>
                                </Space>
                            </Checkbox>

                            <div
                                style={{
                                    marginTop: 4,
                                    paddingLeft: 24,
                                    fontSize: 12,
                                    color: "#888",
                                }}
                            >
                                Markér dette for at tilføje designet til studietur-biblioteket
                                (is_library: true)
                            </div>
                        </div>
                    </Form.Item>

                    <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
                        <Space>
                            <Button
                                onClick={() => {
                                    setUploadModalOpen(false);
                                    uploadForm.resetFields();
                                    setUploadWhiteFile(null);
                                    setUploadWhitePreview(null);
                                    setUploadBlackFile(null);
                                    setUploadBlackPreview(null);
                                    setAdminForAllStudents(false);
                                }}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={uploading}
                                disabled={!uploadWhiteFile || !uploadBlackFile}
                            >
                                Upload
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CountriesPage;
