import React, { useState, useEffect } from 'react';
import {
    List,
    Input,
    Button,
    Card,
    Typography,
    Tag,
    Space,
    message,
    Modal,
    Spin,
    Popconfirm,
    Alert,
    Tooltip,
    Empty
} from 'antd';
import {
    PlusOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    LockOutlined
} from '@ant-design/icons';
import {
    getNameList,
    addNameListItem,
    updateNameListItem,
    reorderNameListItems,
    markNameListReady,
    approveNameList,
    rejectNameList,
    getClassNameListAdmin,
    deleteNameListItem,
    createNameList
} from '../api/api';

const { Title, Text } = Typography;

const NameListManager = ({ classId, isAdmin = false }) => {
    const [loading, setLoading] = useState(false);
    const [nameList, setNameList] = useState(null);
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [editingItem, setEditingItem] = useState(null); // { id, name }

    useEffect(() => {
        if (classId) {
            fetchNameList();
        }
    }, [classId]);

    const fetchNameList = async () => {
        setLoading(true);
        try {
            let response;
            if (isAdmin) {
                response = await getClassNameListAdmin(classId);
            } else {
                // For class rep, we use the get endpoint
                response = await getNameList();
            }

            if (response.data.success) {
                // Handle structure difference
                // Admin: { success: true, nameList, items, ... }
                // Class Rep: { success: true, result: { ..., items: [] } } (from my recent controller change)

                const data = response.data;
                if (isAdmin) {
                    setNameList(data.nameList);
                    setItems(data.items || []);
                } else {
                    const listData = data.data || data.result; // Handle both potential structures
                    setNameList(listData);
                    setItems(listData?.items || []);
                }
            } else {
                message.error('Failed to load name list');
            }
        } catch (error) {
            console.error(error);
            message.error('Error loading name list');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) return;
        try {
            const res = await addNameListItem(nameList.id, { name: newItemName });
            if (res.data.success) {
                message.success('Name added');
                setNewItemName('');
                fetchNameList();
            }
        } catch (error) {
            message.error('Failed to add name');
        }
    };

    const handleUpdateItem = async (id, name) => {
        try {
            await updateNameListItem(id, { name });
            message.success('Name updated');
            setEditingItem(null);
            fetchNameList();
        } catch (error) {
            message.error('Failed to update');
        }
    };

    const handleDeleteItem = async (id) => {
        try {
            await deleteNameListItem(id);
            message.success('Name removed');
            fetchNameList();
        } catch (error) {
            message.error('Failed to delete');
        }
    };

    const moveItem = async (index, direction) => {
        const newItems = [...items];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        }

        // Optimistic update
        setItems(newItems);

        // Prepare API payload (id and new position 1-based)
        const updates = newItems.map((item, idx) => ({
            id: item.id,
            position: idx + 1
        }));

        try {
            await reorderNameListItems(nameList.id, updates);
            // message.success('Order saved');
        } catch (error) {
            message.error('Failed to save order');
            fetchNameList(); // Revert
        }
    };

    const handleMarkReady = async () => {
        try {
            await markNameListReady(nameList.id);
            message.success('List marked as Ready');
            fetchNameList();
        } catch (error) {
            message.error('Failed to update status');
        }
    };

    const handleAdminAction = async (action) => {
        try {
            if (action === 'approve') {
                await approveNameList(nameList.id);
                message.success('Name List Approved');
            } else {
                await rejectNameList(nameList.id);
                message.success('Name List Rejected');
            }
            fetchNameList();
        } catch (error) {
            message.error('Action failed');
        }
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

    if (loading && !nameList) return <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>;

    if (!nameList) {
        if (isAdmin) return <Alert message="No Name List Found" type="info" />;
        return (
            <div style={{ textAlign: 'center', padding: 40 }}>
                <Empty description="No Name List Initiated" />
                <Button type="primary" onClick={async () => {
                    try {
                        await createNameList({ class_id: classId }); // Ensure class_id is passed
                        fetchNameList();
                        message.success('Name List Created');
                    } catch (e) {
                        message.error('Failed to create name list');
                    }
                }}>
                    Start Name List
                </Button>
            </div>
        );
    }

    const isLocked = nameList.process_status === 'locked' || nameList.process_status === 'approved' || (nameList.process_status === 'ready' && !isAdmin);
    const canEdit = !isLocked && !isAdmin;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space>
                    <Title level={4} style={{ margin: 0 }}>Class Name List</Title>
                    {getStatusTag(nameList.process_status)}
                </Space>
                <Space>
                    {!isAdmin && nameList.process_status === 'draft' && (
                        <Popconfirm
                            title="Mark as Ready?"
                            description="Once marked as ready, you cannot edit the list until Admin approves or rejects it."
                            onConfirm={handleMarkReady}
                        >
                            <Button type="primary">Mark as Ready</Button>
                        </Popconfirm>
                    )}
                    {isAdmin && nameList.process_status === 'ready' && (
                        <>
                            <Button danger onClick={() => handleAdminAction('reject')}>Reject</Button>
                            <Button type="primary" onClick={() => handleAdminAction('approve')}>Approve</Button>
                        </>
                    )}
                </Space>
            </div>

            {canEdit && (
                <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                    <Input
                        placeholder="Add student name to list"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onPressEnter={handleAddItem}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>Add</Button>
                </div>
            )}

            <List
                bordered
                dataSource={items}
                renderItem={(item, index) => (
                    <List.Item
                        actions={canEdit ? [
                            <Tooltip title="Move Up">
                                <Button
                                    size="small"
                                    icon={<ArrowUpOutlined />}
                                    disabled={index === 0}
                                    onClick={() => moveItem(index, 'up')}
                                />
                            </Tooltip>,
                            <Tooltip title="Move Down">
                                <Button
                                    size="small"
                                    icon={<ArrowDownOutlined />}
                                    disabled={index === items.length - 1}
                                    onClick={() => moveItem(index, 'down')}
                                />
                            </Tooltip>,
                            <Tooltip title="Edit">
                                <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setEditingItem(item);
                                        // set modal
                                    }}
                                />
                            </Tooltip>,
                            <Popconfirm title="Delete?" onConfirm={() => handleDeleteItem(item.id)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        ] : []}
                    >
                        <Space>
                            <Text type="secondary" style={{ width: 30 }}>{index + 1}.</Text>
                            {editingItem?.id === item.id ? (
                                <Input
                                    defaultValue={item.name}
                                    onBlur={(e) => handleUpdateItem(item.id, e.target.value)}
                                    onPressEnter={(e) => handleUpdateItem(item.id, e.target.value)}
                                    autoFocus
                                    style={{ width: 300 }}
                                />
                            ) : (
                                <Text strong={!canEdit}>{item.name}</Text>
                            )}
                        </Space>
                    </List.Item>
                )}
            />
            {items.length === 0 && <div style={{ textAlign: 'center', margin: 20, color: '#999' }}>No names in list yet.</div>}
        </div>
    );
};

export default NameListManager;
