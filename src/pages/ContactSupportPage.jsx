import React, { useState, useEffect } from 'react';
import { Card, Typography, Input, Button, message, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { sendContactInquiry, getMyClass, getClassRepDelivery } from '../api/api';

const { Title, Text } = Typography;

const ContactSupportPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [classData, setClassData] = useState(null);
    const [deliveryPhone, setDeliveryPhone] = useState('');
    const [supportForm, setSupportForm] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Auto-fill user from localStorage
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setSupportForm(prev => ({
                        ...prev,
                        name: user.name || prev.name,
                        email: user.email || prev.email
                    }));
                }

                // Fetch class data to send along with support inquiry
                const classRes = await getMyClass();
                const myClass = classRes.data?.data?.[0];
                if (myClass) {
                    setClassData(myClass);
                    const deliveryRes = await getClassRepDelivery(myClass.id);
                    if (deliveryRes.data?.success && deliveryRes.data.data) {
                        setDeliveryPhone(deliveryRes.data.data.phone || '');
                    }
                }
            } catch (error) {
                console.error('Failed to load initial data for support', error);
            } finally {
                setPageLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleSupportSubmit = async () => {
        if (!supportForm.name.trim() || !supportForm.email.trim() || !supportForm.subject.trim() || !supportForm.message.trim()) {
            message.error('Udfyld venligst alle felter (Please fill all fields)');
            return;
        }
        setLoading(true);
        try {
            await sendContactInquiry({
                name: supportForm.name,
                email: supportForm.email,
                phone: deliveryPhone || 'Ikke angivet',
                req_for: 'class_rep',
                school_name: classData?.school?.name || 'Ikke angivet',
                class_name: classData?.name || 'Ikke angivet',
                message: `Emne: ${supportForm.subject}\n\n${supportForm.message}`
            });
            message.success('Din besked er sendt. Vi vender tilbage hurtigst muligt! (Message sent!)');
        } catch (error) {
            console.error('Support error:', error);
            message.error('Kunne ikke sende besked. Prøv igen senere. (Could not send message)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            
            <Card style={{ borderRadius: '12px' }}>
                <Title level={3} style={{ marginBottom: '24px' }}>Contact Support</Title>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <Text strong>Navn</Text>
                        <Input
                            placeholder="Dit navn"
                            value={supportForm.name}
                            onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                            disabled={pageLoading}
                        />
                    </div>
                    <div>
                        <Text strong>E-mail</Text>
                        <Input
                            placeholder="Din e-mail"
                            value={supportForm.email}
                            onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                            disabled={pageLoading}
                        />
                    </div>
                    <div>
                        <Text strong>Emne</Text>
                        <Input
                            placeholder="Hvad drejer henvendelsen sig om?"
                            value={supportForm.subject}
                            onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                            disabled={pageLoading}
                        />
                    </div>
                    <div>
                        <Text strong>Besked</Text>
                        <Input.TextArea
                            placeholder="Beskriv dit problem eller spørgsmål..."
                            rows={6}
                            value={supportForm.message}
                            onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                            disabled={pageLoading}
                        />
                    </div>

                    <div style={{ marginTop: '16px', textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => navigate(-1)} disabled={loading}>
                                Annuller
                            </Button>
                            <Button
                                type="primary"
                                onClick={handleSupportSubmit}
                                loading={loading}
                                disabled={pageLoading}
                            >
                                Send besked
                            </Button>
                        </Space>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ContactSupportPage;
