import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Card, 
  Row, 
  Col, 
  Button, 
  Input, 
  Select, 
  Tag, 
  Typography, 
  Space,
  Spin,
  Empty,
  Image,
  Tooltip
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  DownloadOutlined,
  StarOutlined,
  StarFilled
} from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;
const { Meta } = Card;

import { getAutomationTemplates } from '../../api/api';

// Load templates from your backend
const loadTemplatesFromBackend = async (category = 'all') => {
  try {
    const response = await getAutomationTemplates({ 
      category: category === 'all' ? undefined : category,
      is_library: true 
    });
    
    // Handle different response structures
    let templates = [];
    if (response.data) {
      if (Array.isArray(response.data)) {
        templates = response.data;
      } else if (response.data.templates && Array.isArray(response.data.templates)) {
        templates = response.data.templates;
      }
    }
    
    return templates.length > 0 ? templates : Object.values(TEMPLATE_LIBRARY);
  } catch (error) {
    console.error('Failed to load template library:', error);
    return Object.values(TEMPLATE_LIBRARY);
  }
};

// Pre-built template library
const TEMPLATE_LIBRARY = {
  modern_clean: {
    id: 'modern_clean',
    name: 'Modern Clean',
    description: 'Clean, minimalist design with modern typography',
    category: 'all',
    preview: '/api/templates/previews/modern_clean.png',
    colors: ['#2563eb', '#1f2937', '#f8fafc'],
    features: ['Mobile Responsive', 'Dark Mode Support', 'Clean Typography'],
    design: {
      // Email editor design JSON would go here
      body: {
        backgroundColor: '#f8fafc',
        fontFamily: 'Arial, sans-serif'
      }
    }
  },
  studentlife_branded: {
    id: 'studentlife_branded',
    name: 'StudentLife Branded',
    description: 'Official StudentLife brand colors and styling',
    category: 'all',
    preview: '/api/templates/previews/studentlife_branded.png',
    colors: ['#1890ff', '#52c41a', '#ffffff'],
    features: ['Brand Colors', 'Logo Integration', 'Professional'],
    design: {
      body: {
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    }
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist Style',
    description: 'Simple, focused design with minimal elements',
    category: 'welcome',
    preview: '/api/templates/previews/minimalist.png',
    colors: ['#000000', '#ffffff', '#f5f5f5'],
    features: ['Ultra Clean', 'Fast Loading', 'High Contrast'],
    design: {
      body: {
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica, sans-serif'
      }
    }
  },
  colorful_friendly: {
    id: 'colorful_friendly',
    name: 'Colorful & Friendly',
    description: 'Vibrant colors with friendly, approachable design',
    category: 'welcome',
    preview: '/api/templates/previews/colorful_friendly.png',
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
    features: ['Vibrant Colors', 'Friendly Tone', 'Engaging'],
    design: {
      body: {
        backgroundColor: '#f8f9fa',
        fontFamily: 'Arial, sans-serif'
      }
    }
  },
  professional_corporate: {
    id: 'professional_corporate',
    name: 'Professional Corporate',
    description: 'Formal, business-appropriate design',
    category: 'transactional',
    preview: '/api/templates/previews/professional_corporate.png',
    colors: ['#1a365d', '#2d3748', '#edf2f7'],
    features: ['Professional', 'Formal Tone', 'Business Ready'],
    design: {
      body: {
        backgroundColor: '#ffffff',
        fontFamily: 'Georgia, serif'
      }
    }
  },
  notification_alert: {
    id: 'notification_alert',
    name: 'Notification Alert',
    description: 'Eye-catching design for important notifications',
    category: 'notification',
    preview: '/api/templates/previews/notification_alert.png',
    colors: ['#f56565', '#ed8936', '#38b2ac'],
    features: ['Attention Grabbing', 'Clear CTAs', 'Urgent Styling'],
    design: {
      body: {
        backgroundColor: '#fff5f5',
        fontFamily: 'Arial, sans-serif'
      }
    }
  }
};

const COLOR_SCHEMES = {
  blue: { primary: '#1890ff', secondary: '#40a9ff', background: '#f0f8ff' },
  green: { primary: '#52c41a', secondary: '#73d13d', background: '#f6ffed' },
  purple: { primary: '#722ed1', secondary: '#9254de', background: '#f9f0ff' },
  orange: { primary: '#fa8c16', secondary: '#ffa940', background: '#fff7e6' },
  red: { primary: '#f5222d', secondary: '#ff4d4f', background: '#fff1f0' }
};

const EmailTemplateLibrary = ({ visible, onClose, onSelect, category = 'all' }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedColorScheme, setSelectedColorScheme] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);

  // Load templates when component mounts or category changes
  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible, selectedCategory]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const backendTemplates = await loadTemplatesFromBackend(selectedCategory);
      setTemplates(backendTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates(Object.values(TEMPLATE_LIBRARY));
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory || template.category === 'all';
    
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template) => {
    onSelect(template);
  };

  const handlePreviewTemplate = (template) => {
    setPreviewTemplate(template);
  };

  const toggleFavorite = (templateId) => {
    setFavorites(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const applyColorScheme = (template, colorScheme) => {
    if (colorScheme === 'all') return template;
    
    const colors = COLOR_SCHEMES[colorScheme];
    return {
      ...template,
      design: {
        ...template.design,
        body: {
          ...template.design.body,
          backgroundColor: colors.background
        }
      }
    };
  };

  return (
    <>
      <Modal
        title="Email Template Library"
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={null}
        destroyOnClose
      >
        {/* Filters */}
        <div style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Search
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Category"
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: '100%' }}
              >
                <Option value="all">All Categories</Option>
                <Option value="welcome">Welcome</Option>
                <Option value="transactional">Transactional</Option>
                <Option value="notification">Notification</Option>
                <Option value="reminder">Reminder</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="Color Scheme"
                value={selectedColorScheme}
                onChange={setSelectedColorScheme}
                style={{ width: '100%' }}
              >
                <Option value="all">All Colors</Option>
                <Option value="blue">Blue Theme</Option>
                <Option value="green">Green Theme</Option>
                <Option value="purple">Purple Theme</Option>
                <Option value="orange">Orange Theme</Option>
                <Option value="red">Red Theme</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Text type="secondary">
                {filteredTemplates.length} templates
              </Text>
            </Col>
          </Row>
        </div>

        {/* Template Grid */}
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Empty description="No templates found" />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredTemplates.map(template => {
                const isFavorite = favorites.includes(template.id);
                const templateWithColors = applyColorScheme(template, selectedColorScheme);
                
                return (
                  <Col key={template.id} span={8}>
                    <Card
                      hoverable
                      cover={
                        <div style={{ 
                          height: '200px', 
                          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative'
                        }}>
                          {/* Mock preview - in real app, this would be an actual email preview */}
                          <div style={{
                            width: '80%',
                            height: '80%',
                            backgroundColor: template.colors[2] || '#ffffff',
                            border: '1px solid #e8e8e8',
                            borderRadius: '4px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{
                              height: '20px',
                              backgroundColor: template.colors[0],
                              borderRadius: '2px'
                            }} />
                            <div style={{
                              height: '12px',
                              backgroundColor: '#e8e8e8',
                              borderRadius: '2px',
                              width: '70%'
                            }} />
                            <div style={{
                              height: '12px',
                              backgroundColor: '#e8e8e8',
                              borderRadius: '2px',
                              width: '90%'
                            }} />
                            <div style={{
                              height: '24px',
                              backgroundColor: template.colors[1],
                              borderRadius: '2px',
                              width: '50%',
                              marginTop: 'auto'
                            }} />
                          </div>
                          
                          {/* Favorite button */}
                          <Button
                            type="text"
                            icon={isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(template.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)'
                            }}
                          />
                        </div>
                      }
                      actions={[
                        <Tooltip title="Preview">
                          <Button 
                            type="text" 
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewTemplate(template)}
                          />
                        </Tooltip>,
                        <Tooltip title="Use Template">
                          <Button 
                            type="text" 
                            icon={<DownloadOutlined />}
                            onClick={() => handleSelectTemplate(templateWithColors)}
                          />
                        </Tooltip>
                      ]}
                    >
                      <Meta
                        title={template.name}
                        description={
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {template.description}
                            </Text>
                            <div style={{ marginTop: '8px' }}>
                              {template.features.slice(0, 2).map(feature => (
                                <Tag key={feature} size="small" color="blue">
                                  {feature}
                                </Tag>
                              ))}
                            </div>
                            <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                              {template.colors.map((color, index) => (
                                <div
                                  key={index}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    backgroundColor: color,
                                    borderRadius: '50%',
                                    border: '1px solid #e8e8e8'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={`Preview: ${previewTemplate?.name}`}
        open={!!previewTemplate}
        onCancel={() => setPreviewTemplate(null)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setPreviewTemplate(null)}>
            Close
          </Button>,
          <Button 
            key="select" 
            type="primary" 
            onClick={() => {
              handleSelectTemplate(previewTemplate);
              setPreviewTemplate(null);
            }}
          >
            Use This Template
          </Button>
        ]}
      >
        {previewTemplate && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">{previewTemplate.description}</Text>
            </div>
            
            {/* Mock email preview */}
            <div style={{
              border: '1px solid #e8e8e8',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}>
              {/* Email header */}
              <div style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e8e8e8',
                fontSize: '12px',
                color: '#666'
              }}>
                <div><strong>From:</strong> StudentLife &lt;noreply@studentlife.dk&gt;</div>
                <div><strong>Subject:</strong> Welcome to StudentLife, {{name}}!</div>
              </div>
              
              {/* Email body preview */}
              <div style={{
                padding: '24px',
                backgroundColor: previewTemplate.design.body.backgroundColor,
                fontFamily: previewTemplate.design.body.fontFamily,
                minHeight: '400px'
              }}>
                <div style={{
                  maxWidth: '600px',
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    height: '40px',
                    backgroundColor: previewTemplate.colors[0],
                    marginBottom: '24px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 'bold'
                  }}>
                    StudentLife Logo
                  </div>
                  
                  <h2 style={{ color: previewTemplate.colors[0], marginBottom: '16px' }}>
                    Welcome to StudentLife!
                  </h2>
                  
                  <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
                    Hi {{name}}, welcome to the StudentLife platform. We're excited to have you join our community.
                  </p>
                  
                  <p style={{ lineHeight: '1.6', marginBottom: '24px' }}>
                    Your account has been created for {{school}} and you can now start exploring our features.
                  </p>
                  
                  <div style={{
                    backgroundColor: previewTemplate.colors[1],
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontWeight: 'bold'
                  }}>
                    Get Started
                  </div>
                  
                  <div style={{
                    marginTop: '32px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e8e8e8',
                    fontSize: '12px',
                    color: '#666',
                    textAlign: 'center'
                  }}>
                    © 2024 StudentLife. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default EmailTemplateLibrary;