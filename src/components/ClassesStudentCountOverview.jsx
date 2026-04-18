import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Input, Progress, Tag, Button, Space, message } from 'antd';
import { TeamOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { getAllClassesWithStudentCount } from '../api/api';
import AdminStudentCountModal from './AdminStudentCountModal';

const { Title } = Typography;

const ClassesStudentCountOverview = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        search: '',
    });

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const response = await getAllClassesWithStudentCount({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search,
            });
            
            setClasses(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
            }));
        } catch (error) {
            message.error('Failed to fetch classes data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, [pagination.current, pagination.limit, pagination.search]);

    const handleSearch = (value) => {
        setPagination(prev => ({ ...prev, current: 1, search: value }));
    };

    const handleEditExpectedCount = (classRecord) => {
        setSelectedClass(classRecord);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedClass(null);
        fetchClasses(); // Refresh data after update
    };

    const columns = [
        {
            title: 'Class Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{text}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {record.school?.name} • {record.graduation_year}
                    </div>
                </div>
            ),
        },
        {
            title: 'Expected Students',
            dataIndex: 'expected_students',
            key: 'expected_students',
            width: 150,
            render: (count) => (
                <Tag color={count ? 'blue' : 'default'}>
                    {count || 'Not Set'}
                </Tag>
            ),
        },
        {
            title: 'Registered Students',
            dataIndex: 'registered_students',
            key: 'registered_students',
            width: 150,
            render: (count) => (
                <Tag color="green">
                    <TeamOutlined style={{ marginRight: 4 }} />
                    {count || 0}
                </Tag>
            ),
        },
        {
            title: 'Progress',
            key: 'progress',
            width: 200,
            render: (_, record) => {
                const { expected_students, registered_students, completion_percentage } = record;
                
                if (!expected_students) {
                    return <Tag color="default">No Target Set</Tag>;
                }
                
                return (
                    <div>
                        <Progress
                            percent={Math.round(completion_percentage || 0)}
                            size="small"
                            strokeColor={completion_percentage >= 100 ? '#52c41a' : '#1890ff'}
                            format={() => `${registered_students}/${expected_students}`}
                        />
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            {Math.round(completion_percentage || 0)}% Complete
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEditExpectedCount(record)}
                    size="small"
                >
                    Edit Target
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Classes Student Count Overview</Title>
                    <Typography.Text type="secondary">
                        Track expected vs registered students for graduation cap planning
                    </Typography.Text>
                </div>
                <Input.Search
                    placeholder="Search classes..."
                    allowClear
                    style={{ width: 300 }}
                    onSearch={handleSearch}
                    onChange={(e) => {
                        if (!e.target.value) {
                            handleSearch('');
                        }
                    }}
                />
            </div>

            <Card>
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
                            `${range[0]}-${range[1]} of ${total} classes`,
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

            <AdminStudentCountModal
                open={modalOpen}
                onCancel={handleModalClose}
                classId={selectedClass?.id}
                className={selectedClass?.name}
            />
        </div>
    );
};

export default ClassesStudentCountOverview;