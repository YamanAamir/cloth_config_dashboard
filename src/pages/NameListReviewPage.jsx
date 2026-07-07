import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Space, Tag,
    Modal, Input, Select, message, Tooltip, Popconfirm
} from 'antd';
import {
    EyeOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
    UnlockOutlined
} from '@ant-design/icons';
import { getAllNameLists, unlockNameList } from '../api/api';
import NameListManager from '../components/NameListManager';

const { Title } = Typography;

const STATUS_FILTERS = [
    { value: 'draft', label: 'Draft' },
    { value: 'ready', label: 'Ready for Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'locked', label: 'Locked' },
];

const NameListReviewPage = () => {
    const [nameLists, setNameLists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        search: '',
        status: '', // default show all? or maybe 'ready'
    });

    const fetchNameLists = async () => {
        setLoading(true);
        try {
            const response = await getAllNameLists({
                page: pagination.current,
                limit: pagination.limit,
                search: pagination.search,
                ...(pagination.status && { status: pagination.status }),
            });
            const { limit, page, total, totalPages } = response.data.pagination || {};
            setNameLists(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                limit: limit ?? prev.limit,
                current: page ?? prev.current,
                total: total ?? 0,
                totalPages: totalPages ?? 1,
            }));
        } catch (error) {
            message.error('Failed to fetch name lists');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNameLists();
    }, [pagination.current, pagination.limit, pagination.status, pagination.search]);

    const handleUnlock = async (id, className) => {
        try {
            await unlockNameList(id);
            message.success(`Name list unlocked for "${className}"`);
            fetchNameLists();
        } catch (error) {
            message.error(error.response?.data?.message || 'Unlock failed');
        }
    };

    const handleView = (classId) => {
        setSelectedClassId(classId);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedClassId(null);
        fetchNameLists(); // Refresh list after potential approval/rejection
    };

    // Check if effectively locked (either status=locked OR deadline passed)
    const isEffectivelyLocked = (record) => {
        if (record.process_status === 'locked') return true;
        const deadline = record.class?.change_deadline;
        if (deadline && new Date() > new Date(deadline)) return true;
        return false;
    };

    const getStatusTag = (record) => {
        const status = record.process_status;
        const deadlinePassed = record.class?.change_deadline && new Date() > new Date(record.class.change_deadline);
        if (status === 'locked' || deadlinePassed) return <Tag color="orange">Locked</Tag>;
        switch (status) {
            case 'draft': return <Tag color="default">Draft</Tag>;
            case 'ready': return <Tag color="processing" icon={<ClockCircleOutlined />}>Ready for Review</Tag>;
            case 'approved': return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
            case 'rejected': return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
            default: return <Tag>{status}</Tag>;
        }
    };

    const columns = [
        {
            title: 'Class Name',
            key: 'className',
            render: (_, record) => <Typography.Text strong>{record.class?.name || 'Unknown Class'}</Typography.Text>,
        },
        {
            title: 'School',
            key: 'school',
            render: (_, record) => <Typography.Text>{record.class?.school?.name || '—'}</Typography.Text>,
        },
        {
            title: 'Student Count',
            key: 'items',
            render: (_, record) => <Tag>{record.items?.length || 0} students</Tag>,
        },
        {
            title: 'Deadline',
            key: 'deadline',
            render: (_, record) => {
                const d = record.class?.change_deadline;
                if (!d) return <Typography.Text type="secondary">—</Typography.Text>;
                const past = new Date() > new Date(d);
                return <Tag color={past ? 'volcano' : 'blue'}>{new Date(d).toLocaleDateString('en-GB')}</Tag>;
            }
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => getStatusTag(record),
        },
        {
            title: 'Actions',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Tooltip title="View & Review">
                        <Button
                            type="text"
                            icon={<EyeOutlined style={{ color: '#00b96b' }} />}
                            onClick={() => handleView(record.class_id)}
                        />
                    </Tooltip>
                    {isEffectivelyLocked(record) && (
                        <Tooltip title="Unlock name list">
                            <Popconfirm
                                title="Unlock this name list?"
                                description="Class rep will be able to edit names again."
                                onConfirm={() => handleUnlock(record.id, record.class?.name)}
                                okText="Unlock" cancelText="Cancel"
                            >
                                <Button
                                    type="text"
                                    icon={<UnlockOutlined style={{ color: '#faad14' }} />}
                                />
                            </Popconfirm>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Name Lists Review</Title>
                <Typography.Text type="secondary">Review class name lists submitted by Class Representatives</Typography.Text>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <Select
                        placeholder="Filter by Status"
                        allowClear
                        style={{ width: 180 }}
                        options={STATUS_FILTERS}
                        value={pagination.status || undefined}
                        onChange={(v) => setPagination(prev => ({ ...prev, status: v ?? '', current: 1 }))}
                    />
                    {/* <Input.Search
                        placeholder="Search class or school"
                        allowClear
                        enterButton
                        style={{ width: 260 }}
                        onSearch={(v) => setPagination(prev => ({ ...prev, search: v ?? '', current: 1 }))}
                    /> */}
                    <Button onClick={fetchNameLists}>Refresh</Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={nameLists}
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

            <Modal
                title={
                    <Space>
                        <FileTextOutlined />
                        <span>Review Name List</span>
                    </Space>
                }
                open={isModalOpen}
                onCancel={handleModalClose}
                footer={null}
                width={800}
                destroyOnHidden
            >
                {selectedClassId && (
                    <NameListManager
                        classId={selectedClassId}
                        isAdmin={true}
                    />
                )}
            </Modal>
        </div>
    );
};

export default NameListReviewPage;
