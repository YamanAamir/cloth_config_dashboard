import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Tabs, 
  Space, 
  Tag, 
  Tooltip,
  message,
  Row,
  Col,
  Typography,
  Badge,
  Empty
} from 'antd';
import { 
  MailOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  UserAddOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  BellOutlined
} from '@ant-design/icons';
import EmailTemplateEditor from '../components/email/EmailTemplateEditor';
import EmailAutomationSettings from '../components/email/EmailAutomationSettings';
import EmailPreviewModal from '../components/email/EmailPreviewModal';
import { getEmailTemplates, deleteEmailTemplate, toggleEmailTemplateStatus } from '../api/api';
import { TEMPLATE_CATEGORIES } from '../utils/constants';

const { Content } = Layout;
const { Title, Text } = Typography;

// Icon mapping for clean separation of data and UI
const ICON_MAP = {
  MailOutlined: <MailOutlined />,
  UserAddOutlined: <UserAddOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  BellOutlined: <BellOutlined />
};



const AutomatedEmailsPage = () => {
  const [activeTab, setActiveTab] = useState('marketing');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form] = Form.useForm();

  // Load templates when tab changes
  useEffect(() => {
    loadTemplates();
  }, [activeTab]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await getEmailTemplates({ 
        category: activeTab
        // Removed is_automated filter since your templates have is_automated: false
      });
      
      // Handle different response structures
      let templates = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          templates = response.data;
        } else if (response.data.templates && Array.isArray(response.data.templates)) {
          templates = response.data.templates;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          templates = response.data.data;
        }
      }
      
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      message.error('Failed to load email templates');
      
      // Fallback to empty array for development
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setModalType('create');
    setSelectedTemplate(null);
    setModalVisible(true);
  };

  const handleEditTemplate = (template) => {
    setModalType('edit');
    setSelectedTemplate(template);
    setModalVisible(true);
  };

  const handlePreviewTemplate = (template) => {
    setModalType('preview');
    setSelectedTemplate(template);
    setModalVisible(true);
  };

  const handleAutomationSettings = (template) => {
    setModalType('automation');
    setSelectedTemplate(template);
    setModalVisible(true);
  };

  const handleToggleStatus = async (template) => {
    try {
      const newStatus = template.status === 0 ? 1 : 0;
      await toggleEmailTemplateStatus(template.id, { status: newStatus });
      message.success(`Template ${newStatus === 0 ? 'activated' : 'deactivated'} successfully`);
      loadTemplates();
    } catch (error) {
      console.error('Failed to toggle template status:', error);
      message.error('Failed to update template status');
    }
  };

  const handleDeleteTemplate = async (template) => {
    Modal.confirm({
      title: 'Delete Template',
      content: `Are you sure you want to delete "${template.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteEmailTemplate(template.id);
          message.success('Template deleted successfully');
          loadTemplates();
        } catch (error) {
          console.error('Failed to delete template:', error);
          message.error('Failed to delete template');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.subject}
          </Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 0 ? 'green' : 'red'}>
          {status === 0 ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Automation',
      dataIndex: 'is_automated',
      key: 'is_automated',
      render: (enabled) => (
        <Tag color={enabled ? 'blue' : 'default'}>
          {enabled ? 'Enabled' : 'Disabled'}
        </Tag>
      )
    },
    {
      title: 'Performance',
      dataIndex: 'stats',
      key: 'stats',
      render: (stats) => (
        <div style={{ fontSize: '12px' }}>
          <div>Sent: {stats?.sent || 0}</div>
          <div>Opened: {stats?.opened || 0} ({stats?.sent ? Math.round((stats.opened/stats.sent)*100) : 0}%)</div>
          <div>Clicked: {stats?.clicked || 0} ({stats?.sent ? Math.round((stats.clicked/stats.sent)*100) : 0}%)</div>
        </div>
      )
    },
    {
      title: 'Last Modified',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Preview">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handlePreviewTemplate(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditTemplate(record)}
            />
          </Tooltip>
          <Tooltip title="Automation Settings">
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              onClick={() => handleAutomationSettings(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 0 ? 'Deactivate' : 'Activate'}>
            <Button 
              type="text" 
              icon={record.status === 0 ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleStatus(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteTemplate(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Create tab items for Antd Tabs
  const tabItems = Object.values(TEMPLATE_CATEGORIES).map(category => {
    const categoryTemplates = activeTab === category.key ? templates : [];
    
    return {
      key: category.key,
      label: (
        <Space>
          {ICON_MAP[category.icon]}
          <span>{category.label}</span>
          {activeTab === category.key && (
            <Badge count={categoryTemplates.length} 
                   style={{ backgroundColor: category.color }} />
          )}
        </Space>
      ),
      children: (
        <div>
          {/* Category Header */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Title level={4} style={{ margin: 0, color: category.color }}>
                  <Space>
                    {ICON_MAP[category.icon]}
                    {category.label}
                  </Space>
                </Title>
                <Text type="secondary">{category.description}</Text>
              </Col>
              <Col>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleCreateTemplate}
                  style={{ backgroundColor: category.color, borderColor: category.color }}
                >
                  Create Template
                </Button>
              </Col>
            </Row>
          </div>

          {/* Templates Table */}
          <Card>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Title level={4}>Loading templates...</Title>
              </div>
            ) : categoryTemplates.length === 0 ? (
              <Empty
                description={
                  <div>
                    <Title level={4}>No {category.label.toLowerCase()} found</Title>
                    <Text type="secondary">Create your first {category.label.toLowerCase().slice(0, -1)} to get started</Text>
                  </div>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleCreateTemplate}
                  style={{ backgroundColor: category.color, borderColor: category.color }}
                >
                  Create Template
                </Button>
              </Empty>
            ) : (
              <Table
                columns={columns}
                dataSource={categoryTemplates}
                loading={loading}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} templates`
                }}
              />
            )}
          </Card>
        </div>
      )
    };
  });

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MailOutlined />
            Automated Email Templates
          </Title>
          <Text type="secondary">
            Create and manage automated email templates for different user communications
          </Text>
        </div>

        {/* Tabs for Categories */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={tabItems}
        />
      </Content>

      {/* Template Editor/Creator Modal */}
      <Modal
        title={modalType === 'create' ? 'Create Email Template' : 'Edit Email Template'}
        open={modalVisible && (modalType === 'create' || modalType === 'edit')}
        onCancel={() => setModalVisible(false)}
        width={1200}
        footer={null}
        destroyOnHidden
      >
        <EmailTemplateEditor
          template={selectedTemplate}
          category={activeTab}
          onSave={() => {
            message.success('Template saved successfully');
            setModalVisible(false);
            loadTemplates();
          }}
          onCancel={() => setModalVisible(false)}
        />
      </Modal>

      {/* Preview Modal */}
      <EmailPreviewModal
        visible={modalVisible && modalType === 'preview'}
        template={selectedTemplate}
        onClose={() => setModalVisible(false)}
      />

      {/* Automation Settings Modal */}
      <Modal
        title="Automation Settings"
        open={modalVisible && modalType === 'automation'}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={null}
        destroyOnHidden
      >
        <EmailAutomationSettings
          template={selectedTemplate}
          onSave={() => {
            message.success('Automation settings saved successfully');
            setModalVisible(false);
            loadTemplates();
          }}
          onCancel={() => setModalVisible(false)}
        />
      </Modal>
    </Layout>
  );
};

export default AutomatedEmailsPage;