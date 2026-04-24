import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Card, 
  Switch, 
  Select, 
  Input, 
  InputNumber, 
  Button, 
  Space, 
  Divider, 
  Row, 
  Col, 
  Typography, 
  Tag, 
  Alert,
  Collapse,
  TimePicker,
  Checkbox,
  Radio,
  message
} from 'antd';
import { 
  SaveOutlined, 
  InfoCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { updateEmailAutomation } from '../../api/api';

const { Option } = Select;
const { Text, Title } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

// Trigger events for automation
const TRIGGER_EVENTS = {
  user_registration: {
    label: 'User Registration',
    description: 'When a new user registers on the platform',
    variables: ['{{name}}', '{{email}}', '{{role}}', '{{school}}']
  },
  order_placed: {
    label: 'Order Placed',
    description: 'When a user places a new order',
    variables: ['{{name}}', '{{order_id}}', '{{order_date}}', '{{total_amount}}']
  },
  payment_received: {
    label: 'Payment Received',
    description: 'When payment is confirmed for an order',
    variables: ['{{name}}', '{{order_id}}', '{{payment_amount}}', '{{payment_date}}']
  },
  order_status_changed: {
    label: 'Order Status Changed',
    description: 'When order status is updated',
    variables: ['{{name}}', '{{order_id}}', '{{old_status}}', '{{new_status}}']
  },
  deadline_approaching: {
    label: 'Deadline Approaching',
    description: 'When change deadline is near (configurable days)',
    variables: ['{{name}}', '{{order_id}}', '{{deadline}}', '{{days_remaining}}']
  },
  file_uploaded: {
    label: 'File Uploaded',
    description: 'When user uploads a file',
    variables: ['{{name}}', '{{file_name}}', '{{upload_date}}', '{{file_type}}']
  },
  admin_action_required: {
    label: 'Admin Action Required',
    description: 'When admin intervention is needed',
    variables: ['{{admin_name}}', '{{action_type}}', '{{description}}', '{{priority}}']
  },
  scheduled_send: {
    label: 'Scheduled Send',
    description: 'Send at specific date/time intervals',
    variables: ['{{current_date}}', '{{recipient_name}}']
  }
};

// User roles and conditions
const USER_ROLES = [
  { value: 'student', label: 'Students' },
  { value: 'class_rep', label: 'Class Representatives' },
  { value: 'admin', label: 'Administrators' },
  { value: 'school_admin', label: 'School Administrators' }
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' }
];

const EmailAutomationSettings = ({ template, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState(null);
  const [conditions, setConditions] = useState([]);

  useEffect(() => {
    if (template) {
      // Map your backend structure to form fields
      const automation = {
        enabled: template.automation_enabled || false,
        trigger: template.trigger_events?.[0] || '',
        delay_amount: template.delay_hours ? Math.floor(template.delay_hours / 24) : 0,
        delay_unit: template.delay_hours ? (template.delay_hours >= 24 ? 'days' : 'hours') : 'minutes',
        send_time: template.send_time ? dayjs(template.send_time, 'HH:mm') : null,
        frequency_limit: template.frequency_limit || 'unlimited',
        frequency_amount: template.frequency_amount || 1,
        frequency_period: template.frequency_period || 'day',
        target_roles: template.target_audience || [],
        respect_unsubscribe: template.respect_unsubscribe !== false,
        respect_consent: template.respect_consent !== false
      };
      
      form.setFieldsValue(automation);
      setAutomationEnabled(automation.enabled);
      setSelectedTrigger(automation.trigger);
      setConditions(template.conditions || []);
    }
  }, [template, form]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Convert form data to match your backend structure
      const automationData = {
        automation_enabled: values.enabled,
        trigger_events: values.trigger ? [values.trigger] : [],
        delay_hours: calculateDelayHours(values.delay_amount, values.delay_unit),
        send_time: values.send_time ? values.send_time.format('HH:mm') : null,
        frequency_limit: values.frequency_limit,
        frequency_amount: values.frequency_amount,
        frequency_period: values.frequency_period,
        target_audience: values.target_roles || [],
        conditions,
        respect_unsubscribe: values.respect_unsubscribe,
        respect_consent: values.respect_consent,
        updated_at: new Date().toISOString()
      };
      
      await updateEmailAutomation(template.id, automationData);
      message.success('Automation settings saved successfully');
      onSave(automationData);
    } catch (error) {
      console.error('Failed to save automation settings:', error);
      message.error('Failed to save automation settings');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert delay to hours
  const calculateDelayHours = (amount, unit) => {
    if (!amount) return 0;
    
    switch (unit) {
      case 'minutes': return amount / 60;
      case 'hours': return amount;
      case 'days': return amount * 24;
      case 'weeks': return amount * 24 * 7;
      default: return 0;
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: Date.now(),
        field: '',
        operator: 'equals',
        value: ''
      }
    ]);
  };

  const updateCondition = (id, field, value) => {
    setConditions(conditions.map(condition => 
      condition.id === id ? { ...condition, [field]: value } : condition
    ));
  };

  const removeCondition = (id) => {
    setConditions(conditions.filter(condition => condition.id !== id));
  };

  const triggerInfo = selectedTrigger ? TRIGGER_EVENTS[selectedTrigger] : null;

  return (
    <div>
      <Form form={form} layout="vertical">
        {/* Enable/Disable Automation */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={5} style={{ margin: 0 }}>
                Email Automation
              </Title>
              <Text type="secondary">
                Automatically send this email based on triggers and conditions
              </Text>
            </Col>
            <Col>
              <Form.Item name="enabled" valuePropName="checked" style={{ margin: 0 }}>
                <Switch 
                  onChange={setAutomationEnabled}
                  checkedChildren="Enabled" 
                  unCheckedChildren="Disabled" 
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {automationEnabled && (
          <>
            {/* Trigger Settings */}
            <Card title="Trigger Event" size="small" style={{ marginBottom: '16px' }}>
              <Form.Item
                name="trigger"
                label="When should this email be sent?"
                rules={[{ required: true, message: 'Please select a trigger event' }]}
              >
                <Select 
                  placeholder="Select trigger event"
                  onChange={setSelectedTrigger}
                >
                  {Object.entries(TRIGGER_EVENTS).map(([key, event]) => (
                    <Option key={key} value={key}>
                      <div>
                        <div>{event.label}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {event.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {triggerInfo && (
                <Alert
                  message="Available Variables"
                  description={
                    <div>
                      <Text>You can use these variables in your email template:</Text>
                      <div style={{ marginTop: '8px' }}>
                        {triggerInfo.variables.map(variable => (
                          <Tag key={variable} color="blue" style={{ margin: '2px' }}>
                            {variable}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}
            </Card>

            {/* Timing Settings */}
            <Card title="Timing Settings" size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Send Delay">
                    <Input.Group compact>
                      <Form.Item name="delay_amount" style={{ width: '60%', marginBottom: 0 }}>
                        <InputNumber 
                          min={0} 
                          placeholder="0"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                      <Form.Item name="delay_unit" style={{ width: '40%', marginBottom: 0 }}>
                        <Select>
                          <Option value="minutes">Minutes</Option>
                          <Option value="hours">Hours</Option>
                          <Option value="days">Days</Option>
                          <Option value="weeks">Weeks</Option>
                        </Select>
                      </Form.Item>
                    </Input.Group>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Delay before sending email after trigger
                    </Text>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item 
                    name="send_time" 
                    label="Preferred Send Time"
                    help="Leave empty to send immediately"
                  >
                    <TimePicker 
                      format="HH:mm"
                      placeholder="Select time"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Frequency Limits */}
            <Card title="Frequency Limits" size="small" style={{ marginBottom: '16px' }}>
              <Form.Item name="frequency_limit" label="Frequency Limit">
                <Radio.Group>
                  <Radio value="unlimited">No limit</Radio>
                  <Radio value="limited">Limit frequency</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
                prevValues.frequency_limit !== currentValues.frequency_limit
              }>
                {({ getFieldValue }) => {
                  const isLimited = getFieldValue('frequency_limit') === 'limited';
                  return isLimited ? (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          name="frequency_amount" 
                          label="Maximum"
                          rules={[{ required: true, message: 'Required' }]}
                        >
                          <InputNumber min={1} placeholder="1" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="frequency_period" 
                          label="Per"
                          rules={[{ required: true, message: 'Required' }]}
                        >
                          <Select>
                            <Option value="hour">Hour</Option>
                            <Option value="day">Day</Option>
                            <Option value="week">Week</Option>
                            <Option value="month">Month</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : null;
                }}
              </Form.Item>
            </Card>

            {/* Target Audience */}
            <Card title="Target Audience" size="small" style={{ marginBottom: '16px' }}>
              <Form.Item 
                name="target_roles" 
                label="Send to User Roles"
                help="Leave empty to send to all roles"
              >
                <Select mode="multiple" placeholder="Select user roles">
                  {USER_ROLES.map(role => (
                    <Option key={role.value} value={role.value}>
                      {role.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            {/* Conditions */}
            <Card 
              title="Conditions" 
              size="small" 
              style={{ marginBottom: '16px' }}
              extra={
                <Button size="small" onClick={addCondition}>
                  Add Condition
                </Button>
              }
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                Add conditions to control when emails are sent. All conditions must be met.
              </Text>
              
              {conditions.map((condition, index) => (
                <Card key={condition.id} size="small" style={{ marginBottom: '8px' }}>
                  <Row gutter={8} align="middle">
                    <Col span={6}>
                      <Select
                        placeholder="Field"
                        value={condition.field}
                        onChange={(value) => updateCondition(condition.id, 'field', value)}
                        style={{ width: '100%' }}
                      >
                        <Option value="user.role">User Role</Option>
                        <Option value="user.school">School</Option>
                        <Option value="user.class">Class</Option>
                        <Option value="order.status">Order Status</Option>
                        <Option value="order.amount">Order Amount</Option>
                        <Option value="user.consent">Has Consent</Option>
                      </Select>
                    </Col>
                    <Col span={6}>
                      <Select
                        placeholder="Operator"
                        value={condition.operator}
                        onChange={(value) => updateCondition(condition.id, 'operator', value)}
                        style={{ width: '100%' }}
                      >
                        {CONDITION_OPERATORS.map(op => (
                          <Option key={op.value} value={op.value}>
                            {op.label}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={8}>
                      <Input
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                      />
                    </Col>
                    <Col span={4}>
                      <Button 
                        type="text" 
                        danger 
                        onClick={() => removeCondition(condition.id)}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>
                </Card>
              ))}

              {conditions.length === 0 && (
                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                  No conditions set. Email will be sent to all matching users.
                </Text>
              )}
            </Card>

            {/* Compliance Settings */}
            <Card title="Compliance & Privacy" size="small" style={{ marginBottom: '16px' }}>
              <Form.Item name="respect_unsubscribe" valuePropName="checked">
                <Checkbox>
                  Respect unsubscribe preferences (don't send to users who unsubscribed)
                </Checkbox>
              </Form.Item>
              
              <Form.Item name="respect_consent" valuePropName="checked">
                <Checkbox>
                  Only send to users who gave email consent
                </Checkbox>
              </Form.Item>
            </Card>
          </>
        )}
      </Form>

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
            Save Automation Settings
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default EmailAutomationSettings;