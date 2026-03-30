import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Table, Button, Tag, Space,
    message, Empty, Dropdown
} from 'antd';
import {
    FilePdfOutlined, FileExcelOutlined, MoreOutlined, ReloadOutlined
} from '@ant-design/icons';
import { getProductionPackages } from '../api/api';
import { getUploadsUrl } from '../utils/constants';

const { Title, Text } = Typography;

const ProductionFilesPage = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const response = await getProductionPackages();
            setPackages(response.data.data || []);
        } catch (error) {
            message.error('Failed to fetch production packages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const handleDownload = (filePath) => {
        if (!filePath) return;
        // filePath is already "uploads/production_files/filename.pdf"
        const url = getUploadsUrl(filePath);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = filePath.split(/[\\/]/).pop();
        a.click();
    };

    const getDropdownItems = (record) => [
        {
            key: 'pdf',
            label: 'Download PDF',
            icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
            onClick: () => handleDownload(record.pdf_file_path),
            disabled: !record.pdf_file_path,
        },
        {
            key: 'excel',
            label: 'Download Excel',
            icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
            onClick: () => handleDownload(record.excel_file_path),
            disabled: !record.excel_file_path,
        },
    ];

    const columns = [
        {
            title: 'Class',
            key: 'class',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.class?.name || `Class #${record.class_id}`}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.class?.school?.name} · {record.class?.graduation_year}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Generated At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(date).toLocaleString()}
                </Text>
            ),
        },
        {
            title: 'Files',
            key: 'files',
            render: (_, record) => (
                <Space>
                    {record.pdf_file_path && (
                        <Tag color="red" icon={<FilePdfOutlined />}>PDF</Tag>
                    )}
                    {record.excel_file_path && (
                        <Tag color="green" icon={<FileExcelOutlined />}>Excel</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Download',
            key: 'action',
            render: (_, record) => (
                <Dropdown
                    menu={{ items: getDropdownItems(record) }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Button size="small" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Production Files</Title>
                    <Text type="secondary">Generated production packages</Text>
                </div>
            </div>

            <Card className="glass-card" style={{ border: 'none' }}>
                {packages.length === 0 && !loading ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No production files generated yet. Generate from System Classes page."
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={packages}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                    />
                )}
            </Card>
        </div>
    );
};

export default ProductionFilesPage;
