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
    Empty,
    Statistic,
    Row,
    Col,
    Spin
} from 'antd';
import {
    TeamOutlined,
    BankOutlined,
    CalendarOutlined,
    LinkOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
    getMyClass,
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    generateRegistrationLink
} from '../api/api';
import { EditOutlined } from '@ant-design/icons';
import NameListManager from '../components/NameListManager';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MyClassPage = () => {
    const navigate = useNavigate();
    const [myClass, setMyClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [form] = Form.useForm();
    const [registrationLinkModalOpen, setRegistrationLinkModalOpen] = useState(false);
    const [registrationLink, setRegistrationLink] = useState('');
    const [linkLoading, setLinkLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

    const fetchMyClass = async () => {
        setLoading(true);
        try {
            const classRes = await getMyClass();
            setMyClass(classRes.data.data?.[0]);
        } catch (error) {
            message.error('Failed to fetch class details');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await getStudents({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search,
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setStudents(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? (response.data.data?.length || 0),
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyClass();
    }, []);

    useEffect(() => {
        if (myClass) fetchStudents();
    }, [pagination.current, pagination.limit, pagination.search, myClass?.id]);

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
            fetchStudents();
        } catch (error) {
            message.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteStudent(id);
            message.success('Student removed from class');
            fetchStudents();
        } catch (error) {
            message.error('Delete failed');
        }
    };

    const handleGenerateRegistrationLink = async () => {
        setLinkLoading(true);
        try {
            const { data } = await generateRegistrationLink();
            const link = data?.data?.registrationLink || data?.registrationLink || '';
            setRegistrationLink(link);
            setRegistrationLinkModalOpen(true);
            if (link) message.success('Registration link generated');
            else message.warning('No link returned from server');
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to generate link');
        } finally {
            setLinkLoading(false);
        }
    };

    const copyRegistrationLink = () => {
        if (!registrationLink) return;
        navigator.clipboard.writeText(registrationLink).then(() => {
            message.success('Link copied to clipboard');
        }).catch(() => message.error('Failed to copy'));
    };

    const columns = [
        {
            title: 'S/N',
            key: 'serial',
            render: (_, record, index) => index + 1,
        },
        {
            title: 'Student Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
        },
        // {
        //     title: 'Actions',
        //     key: 'action',
        //     render: (_, record) => (
        //         <Space>
        //             <Button
        //                 type="text"
        //                 icon={<EditOutlined style={{ color: '#00b96b' }} />}
        //                 onClick={() => {
        //                     setEditingStudent(record);
        //                     form.setFieldsValue(record);
        //                     setIsModalOpen(true);
        //                 }}
        //             />
        //             <Popconfirm
        //                 title="Delete Student"
        //                 description="Are you sure you want to remove this student?"
        //                 onConfirm={() => handleDelete(record.id)}
        //             >
        //                 <Button type="text" danger icon={<DeleteOutlined />} />
        //             </Popconfirm>
        //         </Space>
        //     ),
        // },
    ];

    if (!myClass && !loading) {
        return (
            <Card className="glass-card" style={{ margin: 24, textAlign: 'center' }}>
                <Empty description="No class assigned to you yet." />
            </Card>
        );
    }
    if (loading) return <Spin className="fade-in" style={{ display: 'block', margin: '24px auto' }} />; // or a spinner

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    {/* <Title level={4} style={{ margin: 0 }}>My Class: {myClass?.name}</Title> */}
                    <Text type="secondary">Manage students and upload class design resources</Text>
                </div>
                <Space>
                    {/* <Button
                        type="default"
                        icon={<UploadOutlined />}
                        onClick={() => navigate('/upload-files')}
                    >
                        Upload Files
                    </Button> */}
                    <Button
                        type="default"
                        icon={<LinkOutlined />}
                        loading={linkLoading}
                        onClick={handleGenerateRegistrationLink}
                    >
                        Generate registration link
                    </Button>
                </Space>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>Class</span>}
                            value={myClass?.name}
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
                                    <TeamOutlined style={{ color: '#00b96b', fontSize: '30px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '500', textDecoration: 'capitalize', fontSize: '30px' }}
                        />
                    </Card>
                </Col>
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
                                    <BankOutlined style={{ color: '#1890ff', fontSize: '30px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '500', textDecoration: 'capitalize', fontSize: '30px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card className="glass-card" style={{ border: 'none' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 500, color: '#666' }}>Graduation Year</span>}
                            value={myClass?.graduation_year}
                            formatter={(value) => value}
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
                                    <CalendarOutlined style={{ color: '#722ed1', fontSize: '30px' }} />
                                </div>
                            }
                            valueStyle={{ color: '#006d75', fontWeight: '500', textDecoration: 'capitalize', fontSize: '30px' }}
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
                        <div style={{ display: 'flex', justifyContent: 'end ', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <Input.Search
                                placeholder="Search student name"
                                allowClear
                                enterButton
                                style={{ width: 280 }}
                                onSearch={(v) => setPagination(prev => ({ ...prev, current: 1, search: v ?? '' }))}
                            />
                        </div>
                        <Table
                            columns={columns}
                            dataSource={students}
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
                    </TabPane>
                    <TabPane
                        tab={<span><EditOutlined /> Name List</span>}
                        key="2"
                    >
                        {myClass && <NameListManager classId={myClass.id} isAdmin={false} />}
                    </TabPane>
                </Tabs>
            </Card>
            {/* 
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
            </Modal> */}

            <Modal
                title="Registration link for students"
                open={registrationLinkModalOpen}
                onCancel={() => setRegistrationLinkModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setRegistrationLinkModalOpen(false)}>Close</Button>,
                    <Button key="copy" type="primary" onClick={copyRegistrationLink} disabled={!registrationLink}>
                        Copy link
                    </Button>,
                ]}
                destroyOnClose
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Share this link with students so they can register and join your class.
                </Text>
                <Input.TextArea
                    readOnly
                    value={registrationLink}
                    rows={3}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
            </Modal>
        </div>
    );
};

export default MyClassPage;
