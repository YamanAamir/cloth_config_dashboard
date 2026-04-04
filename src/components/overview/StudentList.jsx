import React from 'react';
import { Table, Tag, Typography, Spin, Empty, Space } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Text } = Typography;

const STATUS_COLOR = {
    completed: 'success',
    in_progress: 'processing',
    registered: 'blue',
    saved: 'default',
};

const StudentList = ({ students, loading }) => {
    if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;
    if (!students.length) return <Empty description="No students registered yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    const columns = [
        {
            title: 'Student',
            key: 'student',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong><UserOutlined style={{ marginRight: 6, color: '#00b96b' }} />{r.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        <MailOutlined style={{ marginRight: 4 }} />{r.email}
                    </Text>
                    {r.phone_number && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <PhoneOutlined style={{ marginRight: 4 }} />{r.phone_number}
                        </Text>
                    )}
                </Space>
            )
        },
        // {
        //     title: 'Year of Birth',
        //     dataIndex: 'year_of_birth',
        //     key: 'yob',
        //     render: v => v || <Text type="secondary">—</Text>
        // },
        {
            title: 'Order Status',
            key: 'order',
            render: (_, r) => {
                const order = r.orders?.[0];
                if (!order) return <Tag>No Order</Tag>;
                return (
                    <Space direction="vertical" size={0}>
                        <Tag color={STATUS_COLOR[order.process_status] || 'default'}>
                            {order.process_status?.replace(/_/g, ' ').toUpperCase()}
                        </Tag>
                        <Tag color={order.payment_status === 'paid' ? 'success' : 'warning'} style={{ fontSize: 10 }}>
                            {order.payment_status?.toUpperCase()}
                        </Tag>
                    </Space>
                );
            }
        },
        // {
        //     title: 'Consent',
        //     key: 'consent',
        //     render: (_, r) => (
        //         <Space direction="vertical" size={0}>
        //             <Text style={{ fontSize: 11 }}>
        //                 Production: {r.consent_production ? '✅' : '❌'}
        //             </Text>
        //             <Text style={{ fontSize: 11 }}>
        //                 Marketing: {r.consent_marketing ? '✅' : '❌'}
        //             </Text>
        //         </Space>
        //     )
        // },
        {
            title: 'Registered',
            dataIndex: 'created_at',
            key: 'created_at',
            render: d => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString()}</Text>
        }
    ];

    return (
        <Table
            columns={columns}
            dataSource={students}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
        />
    );
};

export default StudentList;
