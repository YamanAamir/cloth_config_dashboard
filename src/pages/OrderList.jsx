import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Card,
    Typography,
    Space,
    Modal,
    Form,
    Input,
    Switch,
    message,
    Popconfirm,
    Select,
    Tag,
    Drawer,
    Descriptions,
    Divider,
    Image,
    List,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, BankOutlined, CalendarOutlined, UserAddOutlined, EyeOutlined } from '@ant-design/icons';
import {
    getAllClasses,
    createClass,
    updateClass,
    deleteClass,
    toggleClassStatus,
    getAllSchools,
    getAllClassReps,
    assignClassRep,
    getAllOrders,
    getOrderDetails
} from '../api/api';
import { Status } from '../utils/constants';

const { Title } = Typography;
const { Option } = Select;

const OrderList = () => {
    const [classes, setClasses] = useState([]);
    const [schools, setSchools] = useState([]);
    const [classReps, setClassReps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await getAllOrders({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search,
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setClasses(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? (response.data.data?.length || 0),
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const [schoolsRes, repsRes] = await Promise.all([
                getAllSchools({ limit: 1000 }),
                getAllClassReps({ limit: 1000 })
            ]);
            setSchools(schoolsRes.data.data || []);
            setClassReps(repsRes.data.data || []);
        } catch (error) {
            message.error('Failed to fetch dropdown data');
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [pagination.current, pagination.limit, pagination.search]);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    const handleAddEdit = async (values) => {
        try {
            const payload = {
                ...values,
                status: values.status ? Status.ACTIVE : Status.INACTIVE
            };

            if (editingClass) {
                await updateClass(editingClass.id, payload);
                message.success('Class updated successfully');
            } else {
                await createClass(payload);
                message.success('Class created successfully');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingClass(null);
            fetchOrders();
        } catch (error) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleAssignRep = async (values) => {
        try {
            const payload = {
                class_id: selectedClass.id,
                class_rep_id: values.class_rep_id
            };
            await assignClassRep(payload);
            message.success('Representative assigned successfully');
            setIsAssignModalOpen(false);
            assignForm.resetFields();
            fetchOrders();
        } catch (error) {
            message.error(error.response?.data?.message || 'Assignment failed');
        }
    }

    const handleView = async (record) => {
        setDrawerLoading(true);
        setIsDrawerOpen(true);
        try {
            const response = await getOrderDetails(record.id);
            setSelectedOrderDetails(response.data.data);
        } catch (error) {
            message.error('Failed to fetch order details');
            setIsDrawerOpen(false);
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteClass(id);
            message.success('Class deleted successfully');
            fetchOrders();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            const newStatus = record.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
            await toggleClassStatus(record.id, { status: newStatus });
            message.success(`Status updated for ${record.name}`);
            fetchOrders();
        } catch (error) {
            message.error('Status update failed');
        }
    };

    const columns = [
        {
            title: 'Student',
            key: 'student',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <strong>{record.student?.name}</strong>
                    <span style={{ fontSize: 12, color: '#888' }}>
                        {record.student?.email}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Class Name',
            key: 'class_name',
            render: (_, record) => (
                <span style={{ fontWeight: 600 }}>
                    {record.class?.name || '-'}
                </span>
            ),
        },
        {
            title: 'Delivery Details',
            key: 'delivery',
            render: (_, record) => {
                const details = record.delivery_details
                    ? JSON.parse(record.delivery_details)
                    : null;

                if (!details) return '-';

                return (
                    <Space direction="vertical" size={0}>
                        <span>{details.firstName} {details.lastName}</span>
                        <span style={{ fontSize: 12, color: '#888' }}>
                            {details.city}, {details.country}
                        </span>
                    </Space>
                );
            },
        },
        {
            title: 'Process Status',
            dataIndex: 'process_status',
            key: 'process_status',
            render: (status) => {
                let color = 'default';

                if (status === 'in_progress') color = 'processing';
                if (status === 'completed') color = 'success';
                if (status === 'pending') color = 'warning';

                return <Tag color={color}>{status}</Tag>;
            },
        },
        {
            title: 'Locked',
            dataIndex: 'is_locked',
            key: 'is_locked',
            render: (locked) => (
                <Tag color={locked ? 'error' : 'success'}>
                    {locked ? 'Locked' : 'Open'}
                </Tag>
            ),
        },
        // {
        //     title: 'Created At',
        //     dataIndex: 'created_at',
        //     key: 'created_at',
        //     render: (date) => (
        //         <Tag color="cyan">
        //             {new Date(date).toLocaleDateString()}
        //         </Tag>
        //     ),
        // },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<EyeOutlined style={{ color: '#00b96b' }} />}
                        onClick={() => handleView(record)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Orders</Title>
                </div>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Search class or school name"
                        allowClear
                        enterButton
                        style={{ width: 300 }}
                        onChange={(e) => {
                            const value = e.target.value;
                            clearTimeout(window.searchTimerClasses);
                            window.searchTimerClasses = setTimeout(() => {
                                setPagination(prev => ({ ...prev, current: 1, search: value }));
                            }, 500);
                        }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={classes}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                            `Showing ${range[0]}-${range[1]} of ${total} (Page ${pagination.current} of ${pagination.totalPages})`,
                        onChange: (page, pageSize) => {
                            setPagination(prev => ({
                                ...prev,
                                current: page,
                                limit: pageSize,
                            }));
                        },
                    }}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingClass ? "Edit Class" : "Add New Class"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAddEdit}
                    initialValues={{ status: true }}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="name"
                        label="Class Name"
                        rules={[{ required: true, message: 'Please enter class name' }]}
                    >
                        <Input prefix={<TeamOutlined />} placeholder="e.g. Class of 2025 A" />
                    </Form.Item>

                    <Form.Item
                        name="graduation_year"
                        label="Graduation Year"
                        rules={[{ required: true, message: 'Please enter graduation year' }]}
                    >
                        <Input type="number" prefix={<CalendarOutlined />} placeholder="e.g. 2025" />
                    </Form.Item>

                    <Form.Item
                        name="school_id"
                        label="Assign School"
                        rules={[{ required: true, message: 'Please select a school' }]}
                    >
                        <Select placeholder="Select a school">
                            {schools.map(school => (
                                <Option key={school.id} value={school.id}>{school.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="status" label="Status" valuePropName="checked">
                        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                {editingClass ? 'Update Class' : 'Create Class'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Assign Representative Modal */}
            <Modal
                title={`Assign Representative to ${selectedClass?.name}`}
                open={isAssignModalOpen}
                onCancel={() => setIsAssignModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={assignForm}
                    layout="vertical"
                    onFinish={handleAssignRep}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="class_rep_id"
                        label="Select Representative"
                        rules={[{ required: true, message: 'Please select a representative' }]}
                    >
                        <Select
                            placeholder="Search and select representative"
                            showSearch
                            optionFilterProp="children"
                        >
                            {classReps.map(rep => (
                                <Option key={rep.id} value={rep.id}>
                                    {rep.name} ({rep.email}) - {rep.school?.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                Assign Representative
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
            {/* Order Details Drawer */}
            <Drawer
                title={`Order Details - #${selectedOrderDetails?.id}`}
                placement="right"
                width={800}
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
                loading={drawerLoading}
                className="order-details-drawer"
            >
                {selectedOrderDetails && (
                    <div style={{ padding: '0 10px' }}>
                        <Descriptions title="Order Info" bordered column={2}>
                            <Descriptions.Item label="Order ID">{selectedOrderDetails.id}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={selectedOrderDetails.process_status === 'completed' ? 'success' : 'processing'}>
                                    {selectedOrderDetails.process_status.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Locked">
                                {selectedOrderDetails.is_locked ? <Tag color="error">Yes</Tag> : <Tag color="success">No</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created At">
                                {new Date(selectedOrderDetails.created_at).toLocaleString()}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <Descriptions title="Student & Class" bordered column={2}>
                            <Descriptions.Item label="Student Name">{selectedOrderDetails.student?.name}</Descriptions.Item>
                            <Descriptions.Item label="Student Email">{selectedOrderDetails.student?.email}</Descriptions.Item>
                            <Descriptions.Item label="Class Name">{selectedOrderDetails.class?.name}</Descriptions.Item>
                            <Descriptions.Item label="Graduation Year">{selectedOrderDetails.class?.graduation_year}</Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        {selectedOrderDetails.delivery_details && (
                            <>
                                <Descriptions title="Delivery Details" bordered column={2}>
                                    {Object.entries(JSON.parse(selectedOrderDetails.delivery_details)).map(([key, value]) => (
                                        <Descriptions.Item key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                                            {value || '-'}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                                <Divider />
                            </>
                        )}

                        <Title level={5}>Order Items</Title>
                        <List
                            grid={{ gutter: 16, column: 1 }}
                            dataSource={selectedOrderDetails.order_items}
                            renderItem={(item) => (
                                <List.Item>
                                    <Card
                                        type="inner"
                                        title={`${item.product_type} - ${item.selectedColor}${item.selectedSize ? ` (${item.selectedSize})` : ''}`}
                                        extra={<Tag color="blue">{item.id}</Tag>}
                                    >
                                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: '300px' }}>
                                                <Descriptions bordered size="small" column={1}>
                                                    {item.design_config?.leftChestType && (
                                                        <Descriptions.Item label="Left Chest">
                                                            {item.design_config.leftChestType}: {item.design_config.leftChestText}
                                                            {item.design_config.leftChestFlag && ` (${item.design_config.leftChestFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                    {item.design_config?.rightChestType && (
                                                        <Descriptions.Item label="Right Chest">
                                                            {item.design_config.rightChestType}: {item.design_config.rightChestText}
                                                            {item.design_config.rightChestFlag && ` (${item.design_config.rightChestFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                    {item.design_config?.leftSleeveType && (
                                                        <Descriptions.Item label="Left Sleeve">
                                                            {item.design_config.leftSleeveType}: {item.design_config.leftSleeveText}
                                                            {item.design_config.leftSleeveFlag && ` (${item.design_config.leftSleeveFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                    {item.design_config?.rightSleeveType && (
                                                        <Descriptions.Item label="Right Sleeve">
                                                            {item.design_config.rightSleeveType}: {item.design_config.rightSleeveText}
                                                            {item.design_config.rightSleeveFlag && ` (${item.design_config.rightSleeveFlag})`}
                                                        </Descriptions.Item>
                                                    )}
                                                </Descriptions>
                                            </div>

                                            {item.design_config?.backDesign?.src && (
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Back Design</div>
                                                    <Image
                                                        width={120}
                                                        src={item.design_config.backDesign.src}
                                                        fallback="https://via.placeholder.com/120?text=No+Design"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default OrderList;
