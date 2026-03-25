import React, { useState, useEffect } from 'react';
import {
    Table,
    Card,
    Typography,
    Space,
    Input,
    Tag,
    message,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getStudents } from '../api/api';
import { Role } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const StudentOverview = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
    });

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
            message.error('Failed to fetch registered students');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [pagination.current, pagination.limit, pagination.search]);

    const columns = [
        {
            title: 'Student Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => (
                <Space>
                    <UserOutlined style={{ color: '#00b96b' }} />
                    <span style={{ fontWeight: 600 }}>{text}</span>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                if (status === 'Order Completed') color = 'success';
                if (status === 'In Progress') color = 'processing';
                if (status === 'Registered') color = 'blue';

                return <Tag color={color} style={{ borderRadius: '4px', fontWeight: 500 }}>{status}</Tag>;
            },
        }
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Student Overview</Title>
                <Typography.Text type="secondary">View students who have registered and their current status</Typography.Text>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Search student name"
                        allowClear
                        enterButton
                        style={{ width: 300 }}
                        onChange={(e) => {
                            const value = e.target.value;
                            clearTimeout(window.searchTimerStudents);
                            window.searchTimerStudents = setTimeout(() => {
                                setPagination(prev => ({ ...prev, current: 1, search: value }));
                            }, 500);
                        }}
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
            </Card>
        </div>
    );
};

export default StudentOverview;
