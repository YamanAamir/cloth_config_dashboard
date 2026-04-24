import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Select, 
  Space, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Input,
  Form,
  message,
  Divider,
  Tag,
  Tooltip
} from 'antd';
import { 
  SendOutlined, 
  EyeOutlined, 
  MobileOutlined, 
  DesktopOutlined,
  ReloadOutlined,
  MailOutlined
} from '@ant-design/icons';
import { sendTestEmail } from '../../api/api';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

// Sample data for different user types
const SAMPLE_DATA_SETS = {
  student: {
    name: 'Emma Nielsen',
    first_name: 'Emma',
    email: 'emma.nielsen@student.dk',
    school: 'Copenhagen High School',
    class: '12A',
    role: 'student',
    order_id: 'ORD-2024-001',
    order_date: '2024-01-15',
    deadline: '2024-02-15',
    status: 'confirmed',
    tracking: 'TRK123456789',
    total_amount: '299 DKK',
    items_count: '3'
  },
  class_rep: {
    name: 'Lars Andersen',
    first_name: 'Lars',
    email: 'lars.andersen@rep.dk',
    school: 'Aarhus International School',
    class: '11B',
    role: 'class_rep',
    order_id: 'ORD-2024-002',
    order_date: '2024-01-16',
    deadline: '2024-02-20',
    status: 'pending',
    tracking: '',
    total_amount: '1,245 DKK',
    items_count: '15'
  },
  admin: {
    name: 'Sarah Johnson',
    first_name: 'Sarah',
    email: 'sarah.johnson@studentlife.dk',
    school: 'StudentLife Admin',
    class: 'N/A',
    role: 'admin',
    order_id: 'ORD-2024-003',
    order_date: '2024-01-17',
    deadline: '2024-02-25',
    status: 'processing',
    tracking: 'TRK987654321',
    total_amount: '2,150 DKK',
    items_count: '25'
  }
};

const SYSTEM_VARIABLES = {
  current_date: new Date().toLocaleDateString('da-DK'),
  company_name: 'StudentLife',
  website: 'https://studentlife.dk',
  support_email: 'support@studentlife.dk',
  login_url: 'https://studentlife.dk/login',
  unsubscribe_url: 'https://studentlife.dk/unsubscribe'
};

const EmailPreviewModal = ({ visible, template, onClose }) => {
  const [viewMode, setViewMode] = useState('desktop'); // desktop, mobile
  const [sampleDataType, setSampleDataType] = useState('student');
  const [customVariables, setCustomVariables] = useState({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [testEmailForm] = Form.useForm();

  useEffect(() => {
    if (template && visible) {
      generatePreview();
    }
  }, [template, visible, sampleDataType, customVariables]);

  const generatePreview = () => {
    if (!template) return;

    // Combine sample data with custom variables and system variables
    const allVariables = {
      ...SAMPLE_DATA_SETS[sampleDataType],
      ...SYSTEM_VARIABLES,
      ...customVariables
    };

    // Replace variables in HTML
    let html = template.html_body || template.html || getDefaultHtml();
    
    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, value);
    });

    setPreviewHtml(html);
  };

  const getDefaultHtml = () => {
    // Default HTML template if none exists
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.subject}</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1890ff; margin: 0;">StudentLife</h1>
          </div>
          
          <h2 style="color: #333; margin-bottom: 16px;">${template.subject}</h2>
          
          <p style="line-height: 1.6; color: #666; margin-bottom: 16px;">
            Hi {{name}}, this is a sample email template. You can customize this content using the email editor.
          </p>
          
          <p style="line-height: 1.6; color: #666; margin-bottom: 24px;">
            Your order {{order_id}} has been processed successfully. You can track your order status in your dashboard.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="{{login_url}}" style="background-color: #1890ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              View Order Details
            </a>
          </div>
          
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8e8e8; font-size: 12px; color: #999; text-align: center;">
            <p>© 2024 {{company_name}}. All rights reserved.</p>
            <p>
              <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a> | 
              <a href="{{support_email}}" style="color: #999;">Contact Support</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleSendTestEmail = async () => {
    try {
      const values = await testEmailForm.validateFields();
      
      // Use your backend API
      await sendTestEmail(template.id, {
        email: values.email,
        variables: {
          ...SAMPLE_DATA_SETS[sampleDataType],
          ...SYSTEM_VARIABLES,
          ...customVariables
        }
      });

      message.success(`Test email sent to ${values.email}`);
      testEmailForm.resetFields();
    } catch (error) {
      console.error('Failed to send test email:', error);
      message.error('Failed to send test email');
    }
  };

  const replacePlaceholders = (text, variables) => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  };

  const handleCustomVariableChange = (key, value) => {
    setCustomVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getUsedVariables = () => {
    if (!template.html && !template.subject) return [];
    
    const text = (template.html || '') + (template.subject || '');
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  };

  if (!template) return null;

  const usedVariables = getUsedVariables();
  const currentData = {
    ...SAMPLE_DATA_SETS[sampleDataType],
    ...SYSTEM_VARIABLES,
    ...customVariables
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MailOutlined />
          <span>Preview: {template.name}</span>
          <Tag color="blue">{template.category}</Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1400}
      style={{ top: 20 }}
      footer={null}
      destroyOnClose
    >
      <Row gutter={24}>
        {/* Left Panel - Controls */}
        <Col span={8}>
          <Card title="Preview Settings" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Sample Data:</Text>
                <Select
                  value={sampleDataType}
                  onChange={setSampleDataType}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <Option value="student">Student Data</Option>
                  <Option value="class_rep">Class Rep Data</Option>
                  <Option value="admin">Admin Data</Option>
                </Select>
              </div>

              <div>
                <Text strong>View Mode:</Text>
                <Select
                  value={viewMode}
                  onChange={setViewMode}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <Option value="desktop">
                    <DesktopOutlined /> Desktop View
                  </Option>
                  <Option value="mobile">
                    <MobileOutlined /> Mobile View
                  </Option>
                </Select>
              </div>

              <Button 
                icon={<ReloadOutlined />} 
                onClick={generatePreview}
                style={{ width: '100%' }}
              >
                Refresh Preview
              </Button>
            </Space>
          </Card>

          {/* Variable Values */}
          {usedVariables.length > 0 && (
            <Card title="Variable Values" size="small" style={{ marginBottom: '16px' }}>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {usedVariables.map(variable => (
                  <div key={variable} style={{ marginBottom: '12px' }}>
                    <Text strong style={{ fontSize: '12px' }}>
                      {`{{${variable}}}`}
                    </Text>
                    <Input
                      size="small"
                      value={currentData[variable] || ''}
                      onChange={(e) => handleCustomVariableChange(variable, e.target.value)}
                      placeholder={`Value for ${variable}`}
                      style={{ marginTop: '4px' }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Test Email */}
          <Card title="Send Test Email" size="small">
            <Form form={testEmailForm} layout="vertical">
              <Form.Item
                name="email"
                label="Test Email Address"
                rules={[
                  { required: true, message: 'Please enter email address' },
                  { type: 'email', message: 'Please enter valid email address' }
                ]}
              >
                <Input placeholder="admin@studentlife.dk" />
              </Form.Item>
              
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendTestEmail}
                style={{ width: '100%' }}
              >
                Send Test Email
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right Panel - Preview */}
        <Col span={16}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Email Preview</span>
                <Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Subject: {replacePlaceholders(template.subject || 'No subject', currentData)}
                  </Text>
                </Space>
              </div>
            }
            size="small"
          >
            <div 
              style={{
                border: '1px solid #e8e8e8',
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
                height: '600px'
              }}
            >
              {/* Email Client Header */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e8e8e8',
                fontSize: '12px',
                color: '#666'
              }}>
                <div><strong>From:</strong> StudentLife &lt;noreply@studentlife.dk&gt;</div>
                <div><strong>To:</strong> {currentData.email}</div>
                <div><strong>Subject:</strong> {replacePlaceholders(template.subject || 'No subject', currentData)}</div>
              </div>

              {/* Email Content */}
              <div style={{
                height: 'calc(100% - 60px)',
                overflow: 'auto',
                padding: viewMode === 'mobile' ? '8px' : '16px'
              }}>
                <div style={{
                  maxWidth: viewMode === 'mobile' ? '100%' : '600px',
                  margin: '0 auto',
                  transform: viewMode === 'mobile' ? 'scale(0.8)' : 'none',
                  transformOrigin: 'top center'
                }}>
                  <iframe
                    srcDoc={previewHtml}
                    style={{
                      width: '100%',
                      height: '500px',
                      border: 'none',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px'
                    }}
                    title="Email Preview"
                  />
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default EmailPreviewModal;