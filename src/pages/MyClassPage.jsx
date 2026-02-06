import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Card,
    Typography,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    message,
    Popconfirm,
    Tabs,
    Upload,
    Divider,
    Descriptions,
    Empty,
    Statistic,
    Row,
    Col
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
    MailOutlined,
    UploadOutlined,
    TeamOutlined,
    FileImageOutlined,
    BankOutlined,
    CalendarOutlined
} from '@ant-design/icons';
import {
    getMyClass,
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    uploadLogo,
    uploadBackDesign
} from '../api/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MyClassPage = () => {
    const [myClass, setMyClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [classRes, studentsRes] = await Promise.all([
                getMyClass(),
                getStudents()
            ]);
            setMyClass(classRes.data.data?.[0]);
            setStudents(studentsRes.data.data || []);
        } catch (error) {
            message.error('Failed to fetch class details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddEdit = async (values) => {
        try {
            if (editingStudent) {
                await updateStudent(editingStudent.id, values);
                message.success('Student updated successfully');
            } else {
                await createStudent(values);
                message.success('Student added successfully');
            }
            setIsModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteStudent(id);
            message.success('Student removed from class');
            fetchData();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleFileUpload = async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            if (type === 'logo') {
                await uploadLogo(formData);
                message.success('Logo uploaded successfully');
            } else {
                await uploadBackDesign(formData);
                message.success('Back design uploaded successfully');
            }
            fetchData(); // Refresh to show uploaded status
            return false; // Prevent default upload behavior
        } catch (error) {
            message.error('Upload failed');
            return false;
        }
    };


    const columns = [
        {
            title: 'Student Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Actions',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#00b96b' }} />}
                        onClick={() => {
                            setEditingStudent(record);
                            form.setFieldsValue(record);
                            setIsModalOpen(true);
                        }}
                    />
                    <Popconfirm
                        title="Delete Student"
                        description="Are you sure you want to remove this student?"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (!myClass && !loading) {
        return (
            <Card className="glass-card" style={{ margin: 24, textAlign: 'center' }}>
                <Empty description="No class assigned to you yet." />
            </Card>
        );
    }

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>My Class: {myClass?.name}</Title>
                <Text type="secondary">Manage students and upload class design resources</Text>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>School</span>}
                            value={myClass?.school?.name}
                            prefix={
                                <div style={{
                                    background: `#1890ff15`,
                                    padding: '8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                    <BankOutlined style={{ color: '#1890ff', fontSize: '24px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '800', fontSize: '24px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>Graduation Year</span>}
                            value={myClass?.graduation_year}
                            prefix={
                                <div style={{
                                    background: `#722ed115`,
                                    padding: '8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                    <CalendarOutlined style={{ color: '#722ed1', fontSize: '24px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '800', fontSize: '24px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>Education Type</span>}
                            value={myClass?.education_type}
                            prefix={
                                <div style={{
                                    background: `#00b96b15`,
                                    padding: '8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                    <TeamOutlined style={{ color: '#00b96b', fontSize: '24px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '800', fontSize: '24px' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card className="glass-card" style={{ border: 'none' }}>
                <Tabs defaultActiveKey="1" animated={{ inkBar: true, tabPane: true }}>
                    <TabPane
                        tab={<span><TeamOutlined /> Student Management</span>}
                        key="1"
                    >
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingStudent(null);
                                    form.resetFields();
                                    setIsModalOpen(true);
                                }}
                            >
                                Add Student
                            </Button>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={students}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </TabPane>

                    <TabPane
                        tab={<span><FileImageOutlined /> Class Resources</span>}
                        key="2"
                    >
                        <div style={{ padding: '20px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div>
                                    <Title level={5}>Class Logo</Title>
                                    <Text type="secondary">Upload your class specific logo (e.g., JPEG, PNG)</Text>
                                    <Divider />
                                    <Upload
                                        beforeUpload={(file) => handleFileUpload(file, 'logo')}
                                        showUploadList={false}
                                    >
                                        <Button icon={<UploadOutlined />} style={{ width: '100%', height: '120px', borderStyle: 'dashed' }}>
                                            Click to Upload Logo
                                        </Button>
                                    </Upload>
                                    {myClass?.logo_path && (
                                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                                            <Tag color="success">Logo Uploaded</Tag>
                                            <div style={{ marginTop: 8 }}>
                                                <img src={myClass.logo_path} alt="Class Logo" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Title level={5}>Back Design</Title>
                                    <Text type="secondary">Upload the collective design for the back of the clothes</Text>
                                    <Divider />
                                    <Upload
                                        beforeUpload={(file) => handleFileUpload(file, 'design')}
                                        showUploadList={false}
                                    >
                                        <Button icon={<UploadOutlined />} style={{ width: '100%', height: '120px', borderStyle: 'dashed' }}>
                                            Click to Upload Back Design
                                        </Button>
                                    </Upload>
                                    {myClass?.back_design_path && (
                                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                                            <Tag color="success">Design Uploaded</Tag>
                                            <div style={{ marginTop: 8 }}>
                                                <img src={myClass.back_design_path} alt="Back Design" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabPane>
                </Tabs>
            </Card>

            <Modal
                title={editingStudent ? "Edit Student" : "Add New Student"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleAddEdit}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        name="name"
                        label="Student Name"
                        rules={[{ required: true, message: 'Please enter student name' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Full Name" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Invalid email format' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                    </Form.Item>
                    {!editingStudent && (
                        <Form.Item
                            name="password"
                            label="Initial Password"
                            rules={[{ required: true, message: 'Please set a password' }]}
                        >
                            <Input.Password placeholder="Password" />
                        </Form.Item>
                    )}
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                {editingStudent ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MyClassPage;
