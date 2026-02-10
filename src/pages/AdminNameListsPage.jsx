import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Tag, Typography, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { getAllNameLists } from '../api/api';
import NameListManager from '../components/NameListManager';

const { Title } = Typography;

const AdminNameListsPage = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedList, setSelectedList] = useState(null);

    const fetchLists = async (page = 1, limit = 10) => {
        setLoading(true);
        try {
            const response = await getAllNameLists({ page, limit });
            if (response.data.success) {
                const { data, pagination: pag } = response.data;
                setData(data || []);
                setPagination(prev => ({
                    ...prev,
                    current: pag.page,
                    limit: pag.limit,
                    total: pag.total,
                    totalPages: pag.totalPages
                }));
            }
        } catch (error) {
            message.error('Failed to fetch name lists');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLists(1, 10);
    }, []);

    const handleTableChange = (pag) => {
        fetchLists(pag.current, pag.pageSize);
    };

    const handleOpenReview = (record) => {
        setSelectedList(record);
        setModalVisible(true);
    };

    const handleCloseReview = () => {
        setModalVisible(false);
        setSelectedList(null);
        fetchLists(pagination.current, pagination.limit);
    };

    const getStatusTag = (status) => {
        switch (status) {
            case 'draft': return <Tag color="default">Draft</Tag>;
            case 'ready': return <Tag color="blue">Ready for Review</Tag>;
            case 'locked': return <Tag color="orange">Locked</Tag>;
            case 'approved': return <Tag color="green">Approved</Tag>;
            case 'rejected': return <Tag color="red">Rejected</Tag>;
            default: return <Tag>{status}</Tag>;
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Class Name',
            key: 'className',
            render: (_, record) => record.class?.name || 'N/A',
        },
        {
            title: 'Status',
            dataIndex: 'process_status',
            key: 'status',
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text) => new Date(text).toLocaleDateString(),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    icon={<EyeOutlined />}
                    onClick={() => handleOpenReview(record)}
                >
                    Review
                </Button>
            ),
        }
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Name Lists Management</Title>
            </div>

            <Card className="glass-card">
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} lists`
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            <Modal
                title={`Review Name List: ${selectedList?.class?.name || ''}`}
                open={modalVisible}
                onCancel={handleCloseReview}
                footer={null}
                width={800}
                destroyOnClose
            >
                {selectedList && (
                    <NameListManager
                        classId={selectedList.class_id}
                        isAdmin={true}
                    />
                )}
            </Modal>
        </div>
    );
};

export default AdminNameListsPage;
