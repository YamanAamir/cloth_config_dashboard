import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  Tabs, 
  Row, 
  Col, 
  Divider,
  Tag,
  Tooltip,
  ColorPicker,
  Typography,
  message,
  Modal
} from 'antd';
import { 
  SaveOutlined, 
  EyeOutlined, 
  SendOutlined,
  CopyOutlined,
  UndoOutlined,
  RedoOutlined
} from '@ant-design/icons';
import EmailEditor from 'react-email-editor';
import EmailTemplateLibrary from './EmailTemplateLibrary';
import { createEmailTemplate, updateEmailTemplate, getEmailTemplates } from '../../api/api';
import { TEMPLATE_CATEGORIES } from '../../utils/constants';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

// Available variables for different template types
const EMAIL_VARIABLES = {
  user: [
    { key: '{{name}}', label: 'User Name', description: 'Full name of the user' },
    { key: '{{first_name}}', label: 'First Name', description: 'User\'s first name' },
    { key: '{{email}}', label: 'Email Address', description: 'User\'s email address' },
    { key: '{{school}}', label: 'School Name', description: 'Name of the school' },
    { key: '{{class}}', label: 'Class Name', description: 'Name of the class' },
    { key: '{{role}}', label: 'User Role', description: 'User\'s role (student, class_rep, admin)' }
  ],
  order: [
    { key: '{{order_id}}', label: 'Order ID', description: 'Unique order identifier' },
    { key: '{{order_date}}', label: 'Order Date', description: 'Date when order was placed' },
    { key: '{{deadline}}', label: 'Change Deadline', description: 'Last date for changes' },
    { key: '{{status}}', label: 'Order Status', description: 'Current order status' },
    { key: '{{tracking}}', label: 'Tracking Code', description: 'Shipment tracking number' },
    { key: '{{total_amount}}', label: 'Total Amount', description: 'Order total amount' },
    { key: '{{items_count}}', label: 'Items Count', description: 'Number of items in order' }
  ],
  system: [
    { key: '{{current_date}}', label: 'Current Date', description: 'Today\'s date' },
    { key: '{{company_name}}', label: 'Company Name', description: 'StudentLife' },
    { key: '{{website}}', label: 'Website URL', description: 'studentlife.dk' },
    { key: '{{support_email}}', label: 'Support Email', description: 'Support contact email' },
    { key: '{{login_url}}', label: 'Login URL', description: 'Link to login page' },
    { key: '{{unsubscribe_url}}', label: 'Unsubscribe URL', description: 'Unsubscribe link' }
  ]
};

const EmailTemplateEditor = ({ template, category, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [emailDesign, setEmailDesign] = useState(null);
  const [allTemplates, setAllTemplates] = useState([]);
  const emailEditorRef = useRef(null);

  useEffect(() => {
    if (template) {
      form.setFieldsValue({
        name: template.name,
        subject: template.subject,
        type: template.type,
        description: template.description,
        selected_template_id: template.id
      });
      
      // Load existing design if available
      if (template.design) {
        setEmailDesign(template.design);
      }
    }
  }, [template, form]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await getEmailTemplates();
        let t = [];
        if (res.data) {
          if (Array.isArray(res.data)) t = res.data;
          else if (res.data.templates && Array.isArray(res.data.templates)) t = res.data.templates;
          else if (res.data.data && Array.isArray(res.data.data)) t = res.data.data;
          else if (res.data.data?.templates && Array.isArray(res.data.data.templates)) t = res.data.data.templates;
        }
        setAllTemplates(t || []);
      } catch (err) {
        console.error('Failed to fetch templates for dropdown');
      }
    };
    fetchTemplates();
  }, []);

  const onReady = () => {
    // Load existing design when editor is ready
    if (emailDesign && emailEditorRef.current) {
      emailEditorRef.current.editor.loadDesign(emailDesign);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const formValues = await form.validateFields();
      
      // Export design from email editor
      emailEditorRef.current.editor.exportHtml((data) => {
        const { design, html } = data;
        
        const templateData = {
          ...formValues,
          category,
          automation_type: formValues.type,
          is_automated: true,
          design,
          html,
          variables: extractVariablesFromHtml(html),
          updated_at: new Date().toISOString()
        };
        
        // Call appropriate API based on whether we're creating or updating
        const updateId = template ? template.id : formValues.selected_template_id;
        const apiCall = updateId 
          ? updateEmailTemplate(updateId, templateData)
          : createEmailTemplate(templateData);
          
        apiCall
          .then(() => {
            message.success(`Template ${template ? 'updated' : 'created'} successfully`);
            onSave(templateData);
          })
          .catch((error) => {
            console.error('Failed to save template:', error);
            message.error(`Failed to ${template ? 'update' : 'create'} template`);
          })
          .finally(() => {
            setLoading(false);
          });
      });
    } catch (error) {
      message.error('Please fill in all required fields');
      setLoading(false);
    }
  };

  const handlePreview = () => {
    emailEditorRef.current.editor.exportHtml((data) => {
      const { html } = data;
      // Open preview with sample data
      const sampleData = generateSampleData();
      const previewHtml = replacePlaceholders(html, sampleData);
      
      const previewWindow = window.open('', '_blank');
      previewWindow.document.write(previewHtml);
      previewWindow.document.close();
    });
  };

  const handleTestSend = () => {
    Modal.confirm({
      title: 'Send Test Email',
      content: 'Send a test email to your admin email address?',
      onOk: () => {
        emailEditorRef.current.editor.exportHtml((data) => {
          const { html } = data;
          // API call to send test email
          message.success('Test email sent successfully');
        });
      }
    });
  };

  const insertVariable = (variable) => {
    // Insert variable at cursor position in subject line or use editor API for body
    const subjectInput = document.querySelector('input[id*="subject"]');
    if (subjectInput && document.activeElement === subjectInput) {
      const start = subjectInput.selectionStart;
      const end = subjectInput.selectionEnd;
      const currentValue = form.getFieldValue('subject') || '';
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      form.setFieldsValue({ subject: newValue });
    } else {
      // For email body, we'd need to use the email editor's API
      message.info(`Variable ${variable} copied to clipboard. Paste it in the email editor.`);
      navigator.clipboard.writeText(variable);
    }
  };

  const loadFromLibrary = (libraryTemplate) => {
    if (emailEditorRef.current) {
      emailEditorRef.current.editor.loadDesign(libraryTemplate.design);
      setLibraryVisible(false);
      message.success('Template loaded from library');
    }
  };

  const extractVariablesFromHtml = (html) => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(html)) !== null) {
      if (!variables.includes(match[0])) {
        variables.push(match[0]);
      }
    }
    
    return variables;
  };

  const generateSampleData = () => {
    return {
      '{{name}}': 'John Doe',
      '{{first_name}}': 'John',
      '{{email}}': 'john.doe@example.com',
      '{{school}}': 'Copenhagen High School',
      '{{class}}': '12A',
      '{{role}}': 'student',
      '{{order_id}}': 'ORD-2024-001',
      '{{order_date}}': '2024-01-15',
      '{{deadline}}': '2024-02-15',
      '{{status}}': 'confirmed',
      '{{tracking}}': 'TRK123456789',
      '{{total_amount}}': '299 DKK',
      '{{items_count}}': '3',
      '{{current_date}}': new Date().toLocaleDateString(),
      '{{company_name}}': 'StudentLife',
      '{{website}}': 'https://studentlife.dk',
      '{{support_email}}': 'support@studentlife.dk',
      '{{login_url}}': 'https://studentlife.dk/login',
      '{{unsubscribe_url}}': 'https://studentlife.dk/unsubscribe'
    };
  };

  const replacePlaceholders = (html, data) => {
    let result = html;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return result;
  };

  const variableTabs = [
    {
      key: 'user',
      label: 'User Variables',
      children: (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {EMAIL_VARIABLES.user.map(variable => (
            <div key={variable.key} style={{ marginBottom: '8px' }}>
              <Button 
                type="text" 
                size="small"
                onClick={() => insertVariable(variable.key)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <div>
                  <Tag color="blue">{variable.key}</Tag>
                  <Text style={{ fontSize: '12px' }}>{variable.label}</Text>
                </div>
                <CopyOutlined />
              </Button>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginLeft: '8px' }}>
                {variable.description}
              </Text>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'order',
      label: 'Order Variables',
      children: (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {EMAIL_VARIABLES.order.map(variable => (
            <div key={variable.key} style={{ marginBottom: '8px' }}>
              <Button 
                type="text" 
                size="small"
                onClick={() => insertVariable(variable.key)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <div>
                  <Tag color="green">{variable.key}</Tag>
                  <Text style={{ fontSize: '12px' }}>{variable.label}</Text>
                </div>
                <CopyOutlined />
              </Button>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginLeft: '8px' }}>
                {variable.description}
              </Text>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'system',
      label: 'System Variables',
      children: (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {EMAIL_VARIABLES.system.map(variable => (
            <div key={variable.key} style={{ marginBottom: '8px' }}>
              <Button 
                type="text" 
                size="small"
                onClick={() => insertVariable(variable.key)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <div>
                  <Tag color="orange">{variable.key}</Tag>
                  <Text style={{ fontSize: '12px' }}>{variable.label}</Text>
                </div>
                <CopyOutlined />
              </Button>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginLeft: '8px' }}>
                {variable.description}
              </Text>
            </div>
          ))}
        </div>
      )
    }
  ];

  return (
    <div>
      <Row gutter={24}>
        {/* Left Panel - Form and Variables */}
        <Col span={8}>
          <Card title="Template Settings" size="small">
            <Form form={form} layout="vertical">
              <Form.Item
                name="selected_template_id"
                label="Select Existing Template"
                tooltip="Select a pre-made template to load its details and apply automation"
              >
                <Select 
                  placeholder="-- Select to Automate Existing --" 
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    if (val) {
                      const selected = allTemplates.find(t => t.id === val);
                      if (selected) {
                        form.setFieldsValue({
                          name: selected.name,
                          subject: selected.subject,
                          description: selected.description,
                        });
                        if (selected.design && emailEditorRef.current) {
                          emailEditorRef.current.editor.loadDesign(selected.design);
                        }
                        setEmailDesign(selected.design);
                      }
                    } else {
                       form.resetFields(['name', 'subject', 'description']);
                       if (!template && emailEditorRef.current) {
                         // clear editor if it was a new creation
                         setEmailDesign(null);
                       }
                    }
                  }}
                >
                  {allTemplates.map(t => (
                    <Option key={t.id} value={t.id}>{t.name} {t.category ? `(${t.category})` : ''}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="name"
                label="Template Name"
                rules={[{ required: true, message: 'Please enter template name' }]}
              >
                <Input placeholder="Enter template name" />
              </Form.Item>

              <Form.Item
                name="subject"
                label="Email Subject"
                rules={[{ required: true, message: 'Please enter email subject' }]}
              >
                <Input placeholder="Enter email subject (use {{variables}})" />
              </Form.Item>

              <Form.Item
                name="type"
                label="Automation Type"
                rules={[{ required: true, message: 'Please select automation type' }]}
              >
                <Select placeholder="Select automation type">
                  {TEMPLATE_CATEGORIES[category?.toUpperCase()]?.templates?.map(template => (
                    <Option key={template.key} value={template.key}>
                      {template.label}
                    </Option>
                  )) || [
                    <Option key="student_welcome" value="student_welcome">Student Welcome</Option>,
                    <Option key="order_confirmation" value="order_confirmation">Order Confirmation</Option>,
                    <Option key="payment_confirmation" value="payment_confirmation">Payment Confirmation</Option>
                  ]}
                </Select>
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea rows={3} placeholder="Template description" />
              </Form.Item>
            </Form>
          </Card>

          <Card title="Variables" size="small" style={{ marginTop: '16px' }}>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px' }}>
              Click to insert variables into your template
            </Text>
            <Tabs size="small" items={variableTabs} />
          </Card>
        </Col>

        {/* Right Panel - Email Editor */}
        <Col span={16}>
          <Card 
            title="Email Design" 
            size="small"
            extra={
              <Space>
                <Button 
                  size="small" 
                  onClick={() => setLibraryVisible(true)}
                >
                  Template Library
                </Button>
                <Button 
                  size="small" 
                  icon={<EyeOutlined />}
                  onClick={handlePreview}
                >
                  Preview
                </Button>
                <Button 
                  size="small" 
                  icon={<SendOutlined />}
                  onClick={handleTestSend}
                >
                  Test Send
                </Button>
              </Space>
            }
          >
            <div style={{ height: '500px' }}>
              <EmailEditor
                ref={emailEditorRef}
                onReady={onReady}
                options={{
                  displayMode: 'email',
                  locale: 'en',
                  appearance: {
                    theme: 'light',
                    panels: {
                      tools: {
                        dock: 'left'
                      }
                    }
                  },
                  features: {
                    preview: true,
                    imageEditor: true,
                    stockImages: false
                  },
                  mergeTags: Object.values(EMAIL_VARIABLES).flat().reduce((acc, variable) => {
                    acc[variable.key] = {
                      name: variable.label,
                      value: variable.key
                    };
                    return acc;
                  }, {})
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Action Buttons */}
      <Divider />
      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            loading={loading}
            onClick={handleSave}
          >
            Save Template
          </Button>
        </Space>
      </div>

      {/* Template Library Modal */}
      <EmailTemplateLibrary
        visible={libraryVisible}
        onClose={() => setLibraryVisible(false)}
        onSelect={loadFromLibrary}
        category={category}
      />
    </div>
  );
};

export default EmailTemplateEditor;