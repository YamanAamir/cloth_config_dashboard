import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Card,
    Typography,
    Space,
    Tag,
    Modal,
    message,
    Row,
    Col,
    Spin,
    Empty,
    Image,
    Upload,
    Input,
    Progress,
    Alert,
    Divider,
    Select
} from 'antd';
import {
    TeamOutlined,
    LinkOutlined,
    PlusOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
    CopyOutlined,
    UploadOutlined,
    EyeOutlined,
    GlobalOutlined,
    EditFilled,
    EditOutlined,
    EnvironmentOutlined,
    PictureOutlined
} from '@ant-design/icons';
import {
    getMyClass,
    generateRegistrationLink,
    getMyLogos,
    uploadLogo,
    getClassBackDesign,
    getClassRepStudentCount,
    setClassRepExpectedStudentCount,
    getStudyTripCountries,
    setStudyTripCountry,
    getClassRepLibraryDesigns,
    getClassRepDelivery,
    updateClassRepDelivery,
    getClassRepShippingRates,
    uploadBackDesign
} from '../api/api';
import { getUploadsUrl, getBackDesignDisplayUrl, Status } from '../utils/constants';
import SimpleUploadModal from '../components/SimpleUploadModal';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const STATUS_CONFIG = {
    [Status.ACTIVE]: {
        label: 'Godkendt',
        color: 'success',
        icon: <CheckCircleOutlined />,
        description: 'Dit design er blevet godkendt!'
    },
    [Status.INACTIVE]: {
        label: 'Under gennemgang',
        color: 'processing',
        icon: <ClockCircleOutlined />,
        description: 'Vi gennemgår dit design'
    },
    [Status.DELETED]: {
        label: 'Kræver ændringer',
        color: 'error',
        icon: <CloseCircleOutlined />,
        description: 'Upload venligst et nyt design'
    },
};

const MyClassPageSimple = () => {
    const navigate = useNavigate();
    const [myClass, setMyClass] = useState(null);
    const [loading, setLoading] = useState(true);
    const [studentCount, setStudentCount] = useState(null);
    const [logos, setLogos] = useState([]);
    const [backDesign, setBackDesign] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [registrationLink, setRegistrationLink] = useState('');
    const [linkLoading, setLinkLoading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [logoName, setLogoName] = useState('');
    const [expectedStudentsModalOpen, setExpectedStudentsModalOpen] = useState(false);
    const [backDesignModalOpen, setBackDesignModalOpen] = useState(false);
    const [uploadType, setUploadType] = useState('logo');
    const [expectedCount, setExpectedCount] = useState(0);
    const [updatingCount, setUpdatingCount] = useState(false);

    // Study Trip
    const [studyTripModalOpen, setStudyTripModalOpen] = useState(false);
    const [studyTripCountries, setStudyTripCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [settingCountry, setSettingCountry] = useState(false);

    // Country Logos
    const [countryLogos, setCountryLogos] = useState([]);
    const [countryLogosLoading, setCountryLogosLoading] = useState(false);

    // Delivery Details
    const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
    const [deliveryDetails, setDeliveryDetails] = useState({
        contactName: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        country: '',
        shippingOption: 'standard',
        shippingPrice: null,
        shippingRateId: null
    });
    const [updatingDelivery, setUpdatingDelivery] = useState(false);
    const [shippingRates, setShippingRates] = useState([]);
    const [loadingRates, setLoadingRates] = useState(false);

    // Fetch all data
    const fetchAllData = async (showMessage = false) => {
        if (showMessage) setRefreshing(true);
        try {
            // First get class and logos
            const [classRes, logosRes] = await Promise.all([
                getMyClass(),
                getMyLogos({ page: 1, limit: 10 })
            ]);
            // Fetch shipping rates for class rep
            try {
                setLoadingRates(true);
                const ratesRes = await getClassRepShippingRates();
                setShippingRates(ratesRes.data?.data.filter(rate => rate.status == 0) || []);
            } catch (error) {
                console.error('Shipping rates fetch error:', error);
                setShippingRates([]);
            } finally {
                setLoadingRates(false);
            }

            const classData = classRes.data.data?.[0];
            setMyClass(classData);
            setLogos(logosRes.data?.data || []);

            // Then get student count if class exists
            if (classData?.id) {
                try {
                    const studentCountRes = await getClassRepStudentCount(classData.id);
                    setStudentCount(studentCountRes.data?.data);
                } catch (error) {
                    console.error('Student count error:', error); // Debug log
                    setStudentCount(null);
                }

                // Fetch back design
                try {
                    const backDesignRes = await getClassBackDesign(classData.id);
                    setBackDesign(backDesignRes.data?.data);
                } catch (error) {
                    setBackDesign(null);
                }

                // Fetch delivery details
                try {
                    const deliveryRes = await getClassRepDelivery(classData.id);
                    if (deliveryRes.data?.success && deliveryRes.data.data) {
                        setDeliveryDetails({
                            contactName: deliveryRes.data.data.contactName || '',
                            phone: deliveryRes.data.data.phone || '',
                            address: deliveryRes.data.data.address || '',
                            city: deliveryRes.data.data.city || '',
                            zip: deliveryRes.data.data.zip || '',
                            shippingOption: deliveryRes.data.data?.shippingOption || 'standard',
                            shippingPrice: deliveryRes.data.data?.shippingPrice || null,
                            country: deliveryRes.data.data.country || classData.country?.name || 'Denmark'
                        });
                    } else {
                        // Fallback country from class if delivery details are not yet set
                        setDeliveryDetails(prev => ({
                            ...prev,
                            country: classData.country?.name || prev.country || 'Denmark'
                        }));
                    }
                } catch (error) {
                    console.error('Delivery details fetch error:', error);
                }
            }

            if (showMessage) {
                message.success('Everything updated!');
            }
        } catch (error) {
            message.error('Failed to load class information');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSimpleUpload = async (formData) => {

        setUploading(true);
        try {
            let response;
            if (uploadType === 'logo') {
                response = await uploadLogo(formData);
                message.success('Logo uploaded successfully!');
            } else {
                response = await uploadBackDesign(formData);
                message.success('Back design uploaded successfully!');
            }

            setUploadModalOpen(false);
        } catch (error) {
            console.error('❌ Upload error:', error);
            console.error('❌ Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
            message.error(`Upload failed: ${errorMessage}`);
        } finally {
            setUploading(false);
        }
    };
    useEffect(() => {
        fetchAllData();
        fetchStudyTripCountries();
        fetchCountryLogos();
    }, []);

    // Fetch study trip countries
    const fetchStudyTripCountries = async () => {
        try {
            const response = await getStudyTripCountries();
            setStudyTripCountries(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch study trip countries');
        }
    };

    // Fetch country logos (library designs for selected country)
    const fetchCountryLogos = async () => {
        setCountryLogosLoading(true);
        try {
            const res = await getClassRepLibraryDesigns();
            setCountryLogos(res.data?.data || []);
        } catch (error) {
            console.error('Failed to fetch country logos');
        } finally {
            setCountryLogosLoading(false);
        }
    };

    // Set study trip country
    const handleSetStudyTripCountry = async () => {
        if (!selectedCountry) {
            message.error('Please select a country');
            return;
        }

        setSettingCountry(true);
        try {
            await setStudyTripCountry({ country_id: selectedCountry });
            message.success('Study trip country updated successfully!');
            setStudyTripModalOpen(false);
            fetchAllData();
            fetchCountryLogos();
        } catch (error) {
            message.error('Failed to update study trip country');
        } finally {
            setSettingCountry(false);
        }
    };

    // Generate registration link
    const handleGenerateLink = async () => {
        setLinkLoading(true);
        try {
            const { data } = await generateRegistrationLink();
            const link = data?.data?.registrationLink || data?.registrationLink || '';
            setRegistrationLink(link);
            setLinkModalOpen(true);
        } catch (error) {
            message.error('Failed to generate registration link');
        } finally {
            setLinkLoading(false);
        }
    };

    // Copy link to clipboard
    const copyLink = () => {
        navigator.clipboard.writeText(registrationLink).then(() => {
            message.success('Link copied! Share it with your classmates');
        });
    };

    // Upload logo
    const handleFileSelect = async (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('Please upload an image file');
            return false;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Image must be smaller than 5MB');
            return false;
        }

        // Set selected file for display - don't upload yet
        setSelectedFile(file);

        // Auto-fill name from filename if empty
        if (!logoName) {
            setLogoName(file.name.replace(/\.[^/.]+$/, ''));
        }

        message.success(`File selected: ${file.name}`);
        return false; // Prevent automatic upload
    };

    // Manual upload function
    const handleManualUpload = async () => {
        if (!selectedFile) {
            message.error('Please select a file first');
            return;
        }
        if (!logoName.trim()) {
            message.error('Please enter a name for the logo');
            return;
        }

        handleActualUpload(selectedFile);
    };

    // Actual upload function
    const handleActualUpload = async (file) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('name', logoName.trim());
            formData.append('logo', file);

            await uploadLogo(formData);
            message.success('Logo uploaded successfully! We will review it soon.');

            // Reset form
            setSelectedFile(null);
            setLogoName('');
            setUploadModalOpen(false);
            fetchAllData();
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Upload failed. Please try again.';
            message.error(errorMessage);
        } finally {
            setUploading(false);
        }
        return false;
    };

    // Update expected student count
    const handleUpdateExpectedCount = async () => {
        if (!expectedCount || expectedCount < 1) {
            message.error('Please enter a valid number');
            return;
        }
        if (!myClass?.id) {
            message.error('Class information not found');
            return;
        }

        setUpdatingCount(true);
        try {
            await setClassRepExpectedStudentCount(myClass.id, { expected_students: expectedCount });
            message.success('Expected student count updated!');
            setExpectedStudentsModalOpen(false);
            fetchAllData();
        } catch (error) {
            message.error('Failed to update count');
        } finally {
            setUpdatingCount(false);
        }
    };

    // Update class delivery details
    const handleUpdateDeliveryDetails = async () => {
        if (!deliveryDetails.address.trim()) {
            message.error('Angiv venligst gadeadresse');
            return;
        }
        if (!myClass?.id) {
            message.error('Klasse information ikke fundet');
            return;
        }

        setUpdatingDelivery(true);
        try {
            await updateClassRepDelivery(myClass.id, deliveryDetails);
            message.success('Leveringsadresse opdateret!');
            setDeliveryModalOpen(false);
            fetchAllData();
        } catch (error) {
            message.error('Kunne ikke opdatere leveringsadresse');
        } finally {
            setUpdatingDelivery(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!myClass) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Empty
                    description="No class assigned to you yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </div>
        );
    }

    const approvedLogos = logos.filter(logo => logo.status === Status.ACTIVE);
    const pendingLogos = logos.filter(logo => logo.status === Status.INACTIVE);
    const rejectedLogos = logos.filter(logo => logo.status === Status.DELETED);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <Title level={2} style={{ marginBottom: 0 }}>
                    {myClass.name}
                </Title>
                <Text type="secondary">
                    {myClass.school?.name} • Klasse af {myClass.graduation_year}
                </Text>
            </div>




            <Row gutter={[24, 24]} style={{ marginBottom: '40px' }} justify="center">
                <Col xs={24} md={16} lg={8}>
                    <Card
                        id="tour-students-card"
                        style={{
                            height: '100%',
                            borderRadius: 12,
                            transition: '0.3s',
                            cursor: 'pointer'
                        }}
                        bodyStyle={{ padding: '24px' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <TeamOutlined style={{ fontSize: 42, color: '#1677ff', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 4 }}>
                                Elever
                            </Title>
                            <Text type="secondary">
                                Del link og spor registreringer
                            </Text>
                        </div>

                        <Divider />
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 20 }}>
                                {studentCount?.registered_students || 0}
                            </Text>
                            <Text type="secondary"> / {studentCount?.expected_students || 'Set target'}</Text>
                        </div>


                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <Button
                                type="primary"
                                icon={<LinkOutlined />}
                                onClick={handleGenerateLink}
                                loading={linkLoading}
                                style={{ flex: 1 }}
                            >
                                Hent link
                            </Button>

                            <Button
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                                onClick={() => {
                                    setExpectedCount(studentCount?.expected_students || 0);
                                    setExpectedStudentsModalOpen(true);
                                }}
                            >
                                <span>Forventet: {studentCount?.expected_students || 'Angiv'}</span>
                                <EditOutlined />
                            </Button>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12} lg={8}>
                    <Card
                        id="tour-studietur-card"
                        style={{
                            height: '100%',
                            borderRadius: 12,
                            transition: '0.3s',
                            cursor: 'pointer'
                        }}
                        bodyStyle={{ padding: '24px' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <GlobalOutlined style={{ fontSize: 42, color: '#722ed1', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 4 }}>
                                Studietur
                            </Title>
                            <Text type="secondary">
                                Vælg destinationsland
                            </Text>
                        </div>

                        <Divider />

                        {/* Country Status */}
                        <div style={{ marginBottom: 16, textAlign: 'center' }}>
                            {myClass?.country ? (
                                <Tag color="success" style={{ fontSize: '14px', padding: '4px 12px' }}>
                                    {myClass.country.name}
                                </Tag>
                            ) : (
                                <Tag color="default">Intet land valgt</Tag>
                            )}
                        </div>

                        <Button
                            type="primary"
                            icon={<GlobalOutlined />}
                            onClick={() => {
                                setSelectedCountry(myClass?.country_id || null);
                                setStudyTripModalOpen(true);
                            }}
                            block
                        >
                            {myClass?.country ? 'Skift land' : 'Vælg land'}
                        </Button>
                    </Card>
                </Col>

                <Col xs={24} md={12} lg={8}>
                    <Card
                        id="tour-delivery-card"
                        style={{
                            height: '100%',
                            borderRadius: 12,
                            transition: '0.3s',
                            cursor: 'pointer'
                        }}
                        bodyStyle={{ padding: '24px' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <EnvironmentOutlined style={{ fontSize: 42, color: '#ff4d4f', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 4 }}>
                                Levering
                            </Title>
                            <Text type="secondary">
                                Fælles leveringsadresse
                            </Text>
                        </div>

                        <Divider />

                        {/* Delivery Address Status */}
                        <div style={{ marginBottom: 16, textAlign: 'center' }}>
                            {deliveryDetails.address ? (
                                <Tag color="success" style={{ fontSize: '13px', padding: '2px 8px' }}>
                                    Adresse angivet
                                </Tag>
                            ) : (
                                <Tag color="warning" style={{ fontSize: '13px', padding: '2px 8px' }}>
                                    Adresse mangler
                                </Tag>
                            )}
                        </div>

                        <Button
                            type="primary"
                            icon={<EnvironmentOutlined />}
                            onClick={() => setDeliveryModalOpen(true)}
                            block
                        >
                            {deliveryDetails.address ? 'Rediger adresse' : 'Angiv adresse'}
                        </Button>
                    </Card>
                </Col>

                <Col xs={24} md={12} lg={8}>
                    <Card
                        id="tour-backdesign-card"
                        style={{
                            height: '100%',
                            borderRadius: 12,
                            transition: '0.3s',
                            cursor: 'pointer'
                        }}
                        bodyStyle={{ padding: '24px' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <PictureOutlined style={{ fontSize: 42, color: '#faad14', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 4 }}>Backdesign</Title>
                            <Text type="secondary">Vælg baggrundsdesign til klassen</Text>
                        </div>
                        <Divider />
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => { setUploadType('design'); setUploadModalOpen(true); }}
                            block
                        >
                            Vælg design
                        </Button>
                    </Card>
                </Col>

                <Col xs={24} md={12} lg={8}>
                    <Card
                        id="tour-upload-logo-card"
                        style={{
                            height: '100%',
                            borderRadius: 12,
                            transition: '0.3s',
                            cursor: 'pointer'
                        }}
                        bodyStyle={{ padding: '24px' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <UploadOutlined style={{ fontSize: 42, color: '#1890ff', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 4 }}>
                                Upload logo
                            </Title>
                            <Text type="secondary">
                                Klasselogo til dimissionsgenstande
                            </Text>
                        </div>

                        <Divider />

                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { setUploadType('logo'); setUploadModalOpen(true); }}
                            block
                        >
                            Upload logo
                        </Button>


                    </Card>
                </Col>

            </Row>
            {myClass?.country_id && (
                <Card
                    title={
                        <Space>
                            <GlobalOutlined style={{ color: '#7c3aed' }} />
                            <span>
                                {myClass.country?.name
                                    ? `${myClass.country.name} — Logoer`
                                    : 'Studietur logoer'}
                            </span>
                        </Space>
                    }
                    style={{ marginBottom: '24px', borderRadius: 12 }}
                >
                    {countryLogosLoading ? (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <Spin />
                        </div>
                    ) : countryLogos.length === 0 ? (
                        <Empty
                            description="Ingen logoer tilgængelige for dit land"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ) : (
                        <Row gutter={[16, 16]}>
                            {countryLogos.map(logo => (
                                <Col xs={12} sm={8} md={6} lg={4} key={logo.id}>
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '16px',
                                            border: '1px solid #f0f0f0',
                                            borderRadius: '12px',
                                            transition: '0.3s',
                                            cursor: 'default',
                                            background: '#fafafa',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                                    >
                                        <Image
                                            src={getBackDesignDisplayUrl(logo)}
                                            alt={logo.name}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                            }}
                                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3a0C1QHBZF2TwMzFkBBfmALdkclNOQePOuNIoLn8dqS0DIBGf8CdRMBmhJAkAOY6ApBERBQCQxoBMl9BhQsgJBgMQXQCgHQIIByBDRQVBgwEDXFNFgGBYmgABNRBxbmRYFDpBA=="
                                        />
                                        <div style={{ marginTop: '10px' }}>
                                            <Text
                                                strong
                                                style={{ fontSize: '12px', display: 'block' }}
                                                ellipsis={{ tooltip: logo.name }}
                                            >
                                                {logo.name}
                                            </Text>
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Card>
            )}
            {/* All Logos */}
            {logos.length > 1 && (
                <Card
                    title="Alle dine logoer"
                    style={{
                        marginBottom: '24px',
                        borderRadius: 12
                    }}
                >
                    <Row gutter={[16, 16]}>
                        {logos.map(logo => (
                            <Col xs={12} sm={6} md={6} key={logo.id}>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '16px',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: '12px',
                                    transition: '0.3s',
                                    cursor: 'pointer'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                                >
                                    <Image
                                        src={getUploadsUrl(logo.file_path)}
                                        alt={logo.name}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            objectFit: 'cover',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <div style={{ marginTop: '12px' }}>
                                        <Text strong style={{ fontSize: '12px', display: 'block' }}>
                                            {logo.name}
                                        </Text>
                                        <Tag
                                            size="small"
                                            color={STATUS_CONFIG[logo.status]?.color}
                                            style={{ marginTop: '8px' }}
                                        >
                                            {STATUS_CONFIG[logo.status]?.label}
                                        </Tag>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}
            {/* Current Status */}
            <Card
                id="tour-status-card"
                title="Aktuel status"
                style={{
                    marginBottom: '24px',
                    borderRadius: 12
                }}
            >
                <Row gutter={[24, 24]}>
                    {/* Back Design Status */}
                    <Col xs={24} md={12}>
                        <div style={{
                            padding: '20px',
                            background: '#fafafa',
                            borderRadius: '12px',
                            height: '100%'
                        }}>
                            <Title level={5} style={{ marginBottom: 16 }}>Bagdesign</Title>
                            {backDesign ? (
                                <div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <Image
                                            src={getBackDesignDisplayUrl(backDesign)}
                                            alt={backDesign.name}
                                            style={{
                                                width: '120px',
                                                height: '120px',
                                                objectFit: 'cover',
                                                borderRadius: '8px'
                                            }}
                                        />
                                    </div>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        {backDesign.name}
                                    </Text>

                                    {/* Show configurator info if available */}
                                    {backDesign.isFromConfigurator && backDesign.configurator_state && (
                                        <div style={{ marginBottom: 8 }}>
                                            <Tag color="blue" size="small">
                                                Konfigurator design
                                            </Tag>
                                            {backDesign.configurator_state.textElements && (
                                                <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                                                    {backDesign.configurator_state.textElements.length} tekstelementer
                                                </Text>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '8px' }}>
                                        <Tag
                                            color={STATUS_CONFIG[backDesign.status]?.color}
                                            icon={STATUS_CONFIG[backDesign.status]?.icon}
                                        >
                                            {STATUS_CONFIG[backDesign.status]?.label}
                                        </Tag>
                                    </div>
                                    <Text type="secondary">
                                        {STATUS_CONFIG[backDesign.status]?.description}
                                    </Text>
                                </div>
                            ) : (
                                <Empty
                                    description="Ingen bagdesign valgt endnu"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            )}
                        </div>
                    </Col>

                    {/* Latest Logo Status */}
                    <Col xs={24} md={12}>
                        <div style={{
                            padding: '20px',
                            background: '#fafafa',
                            borderRadius: '12px',
                            height: '100%'
                        }}>
                            <Title level={5} style={{ marginBottom: 16 }}>Seneste logo</Title>
                            {logos.length > 0 ? (
                                <div>
                                    {logos.slice(0, 1).map(logo => (
                                        <div key={logo.id}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <Image
                                                    src={getUploadsUrl(logo.file_path)}
                                                    alt={logo.name}
                                                    style={{
                                                        width: '120px',
                                                        height: '120px',
                                                        objectFit: 'cover',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                            </div>
                                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                                {logo.name}
                                            </Text>
                                            <div style={{ marginBottom: '8px' }}>
                                                <Tag
                                                    color={STATUS_CONFIG[logo.status]?.color}
                                                    icon={STATUS_CONFIG[logo.status]?.icon}
                                                >
                                                    {STATUS_CONFIG[logo.status]?.label}
                                                </Tag>
                                            </div>
                                            <Text type="secondary">
                                                {STATUS_CONFIG[logo.status]?.description}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty
                                    description="Ingen logoer uploadet endnu"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            )}
                        </div>
                    </Col>
                </Row>
            </Card>




            {/* Registration Link Modal */}
            <Modal
                title="Del dette link med dine klassekammerater"
                open={linkModalOpen}
                onCancel={() => setLinkModalOpen(false)}
                footer={null}
                width={600}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Paragraph>
                        Send dette link til dine klassekammerater, så de kan registrere sig og bestille deres dimissionsgenstande:
                    </Paragraph>
                    <div style={{
                        padding: '16px',
                        background: '#f6f6f6',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        wordBreak: 'break-all'
                    }}>
                        <Text >{registrationLink}</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<CopyOutlined />}
                        onClick={copyLink}
                        size="large"
                    >
                        Kopiér link
                    </Button>
                </div>
            </Modal>

            {/* Upload Modal */}
            <SimpleUploadModal
                open={uploadModalOpen}
                onCancel={() => setUploadModalOpen(false)}
                onUpload={handleSimpleUpload}
                uploadType={uploadType}
                loading={uploading}
            />

            {/* Expected Students Modal */}
            <Modal
                title="Hvor mange elever forventes?"
                open={expectedStudentsModalOpen}
                onOk={handleUpdateExpectedCount}
                onCancel={() => setExpectedStudentsModalOpen(false)}
                confirmLoading={updatingCount}
                okText="Gem"
                cancelText="Annuller"
            >
                <div style={{ padding: '20px 0' }}>
                    <Paragraph>
                        Fortæl os, hvor mange elever du forventer i din klasse. Dette hjælper os med at spore registreringsfremskridt.
                    </Paragraph>
                    <Input
                        type="number"
                        placeholder="Indtast antal forventede elever"
                        value={expectedCount}
                        onChange={(e) => setExpectedCount(parseInt(e.target.value) || 0)}
                        min={1}
                        max={1000}
                        size="large"
                    />
                    {studentCount ? (
                        <div style={{ marginTop: '12px' }}>
                            <Text type="secondary">
                                Aktuelt registrerede: {studentCount.registered_students || 0} elever
                            </Text>
                        </div>
                    ) : (
                        <div style={{ marginTop: '12px' }}>
                            <Text type="secondary">
                                Indlæser nuværende registreringsantal...
                            </Text>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                title="Vælg studietur destination"
                open={studyTripModalOpen}
                onOk={handleSetStudyTripCountry}
                onCancel={() => setStudyTripModalOpen(false)}
                confirmLoading={settingCountry}
                okText="Gem land"
                cancelText="Annuller"
                width={500}
            >
                <div style={{ padding: '20px 0' }}>
                    <Paragraph>
                        Vælg det land, din klasse tager på studietur til. Dette bruges til dimissionsdesigns og planlægning.
                    </Paragraph>

                    {studyTripCountries.length > 0 ? (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                            }}
                        >
                            {studyTripCountries.map((country) => (
                                <Card
                                    key={country.id}
                                    hoverable
                                    size="small"
                                    onClick={() => setSelectedCountry(country.id)}
                                    style={{
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        border:
                                            selectedCountry === country.id
                                                ? '2px solid #19997f'
                                                : '1px solid #f0f0f0',
                                        background:
                                            selectedCountry === country.id
                                                ? '#e6fff5'
                                                : '#fff',
                                    }}
                                >
                                    <Text
                                        strong
                                        style={{ fontSize: '13px', textAlign: 'center' }}
                                    >
                                        {country.name}
                                    </Text>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Empty
                            description="Ingen lande tilgængelige"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </div>
            </Modal>

            {/* Delivery Modal */}
            <Modal
                title="Leveringsadresse"
                open={deliveryModalOpen}
                onCancel={() => setDeliveryModalOpen(false)}
                footer={null}
                width={500}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    {/* <Input
                        placeholder="Kontaktperson"
                        value={deliveryDetails.contactName}
                        onChange={e => setDeliveryDetails({ ...deliveryDetails, contactName: e.target.value })}
                    />
                    <Input
                        placeholder="Telefon"
                        value={deliveryDetails.phone}
                        onChange={e => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })}
                    /> */}
                    <Row gutter={[12, 12]}>
                        <Col span={24}>
                            <Input
                                placeholder="Adresse"
                                value={deliveryDetails.address}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <Input
                                placeholder="By"
                                value={deliveryDetails.city}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <Input
                                placeholder="Postnummer"
                                value={deliveryDetails.zip}
                                onChange={e => setDeliveryDetails({ ...deliveryDetails, zip: e.target.value })}
                            />
                        </Col>
                    </Row>
                    <Select
                        placeholder="Land"
                        value={deliveryDetails.country}
                        onChange={val => {
                            const rate = shippingRates.find(r => r.country_name === val);
                            const isExpress = deliveryDetails.shippingOption === 'express';
                            const price = rate
                                ? parseFloat(isExpress ? rate.express_delivery_rate : rate.regular_delivery_rate)
                                : null;
                            setDeliveryDetails({
                                ...deliveryDetails,
                                country: val,
                                shippingPrice: price,
                                shippingRateId: rate ? rate.id : null
                            });
                        }}
                        style={{ width: '100%' }}
                    >
                        {shippingRates.length > 0 ? (
                            shippingRates.map(rate => (
                                <Select.Option key={rate.id} value={rate.country_name}>
                                    {rate.country_name} — {rate.regular_delivery_rate} {rate.currency}
                                </Select.Option>
                            ))
                        ) : (
                            <>
                                <Select.Option value="Denmark">Denmark</Select.Option>
                                <Select.Option value="Sverige">Sverige</Select.Option>
                                <Select.Option value="Norway">Norway</Select.Option>
                            </>
                        )}
                    </Select>
                    {deliveryDetails.country && (
                        <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                            <Row gutter={[12, 12]}>
                                <Col span={24} sm={12}>
                                    <div
                                        onClick={() => {
                                            const rate = shippingRates.find(r => r.country_name.toLowerCase() === (deliveryDetails.country || '').toLowerCase());
                                            setDeliveryDetails({
                                                ...deliveryDetails,
                                                shippingOption: 'standard',
                                                shippingPrice: rate ? parseFloat(rate.regular_delivery_rate) : null
                                            });
                                        }}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '24px',
                                            border: `2px solid ${deliveryDetails.shippingOption === 'standard' ? '#00b96b' : '#f0f0f0'}`,
                                            backgroundColor: deliveryDetails.shippingOption === 'standard' ? '#f6ffed' : '#fafafa',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: `2px solid ${deliveryDetails.shippingOption === 'standard' ? '#00b96b' : '#d9d9d9'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '12px',
                                            backgroundColor: deliveryDetails.shippingOption === 'standard' ? '#00b96b' : 'white',
                                            flexShrink: 0
                                        }}>
                                            {deliveryDetails.shippingOption === 'standard' && <div style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '50%' }}></div>}
                                        </div>
                                        <div>
                                            <Typography.Text strong style={{ fontSize: '12px', display: 'block', color: '#1f2937' }}>Regelmæssig levering</Typography.Text>
                                            <Typography.Text type="secondary" style={{ fontSize: '10px' }}>
                                                {(() => { const r = shippingRates.find(x => x.country_name.toLowerCase() === (deliveryDetails.country || '').toLowerCase()); return r ? `${r.regular_delivery_rate} ${r.currency} — Est. 6 weeks` : 'Est. 6 weeks'; })()}
                                            </Typography.Text>
                                        </div>
                                    </div>
                                </Col>
                                <Col span={24} sm={12}>
                                    <div
                                        onClick={() => {
                                            const rate = shippingRates.find(r => r.country_name.toLowerCase() === (deliveryDetails.country || '').toLowerCase());
                                            setDeliveryDetails({
                                                ...deliveryDetails,
                                                shippingOption: 'express',
                                                shippingPrice: rate ? parseFloat(rate.express_delivery_rate) : null
                                            });
                                        }}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '24px',
                                            border: `2px solid ${deliveryDetails.shippingOption === 'express' ? '#00b96b' : '#f0f0f0'}`,
                                            backgroundColor: deliveryDetails.shippingOption === 'express' ? '#f6ffed' : '#fafafa',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: `2px solid ${deliveryDetails.shippingOption === 'express' ? '#00b96b' : '#d9d9d9'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '12px',
                                            backgroundColor: deliveryDetails.shippingOption === 'express' ? '#00b96b' : 'white',
                                            flexShrink: 0
                                        }}>
                                            {deliveryDetails.shippingOption === 'express' && <div style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '50%' }}></div>}
                                        </div>
                                        <div>
                                            <Typography.Text strong style={{ fontSize: '12px', display: 'block', color: '#1f2937' }}>Ekspresprioritet</Typography.Text>
                                            <Typography.Text type="secondary" style={{ fontSize: '10px' }}>
                                                {(() => { const r = shippingRates.find(x => x.country_name.toLowerCase() === (deliveryDetails.country || '').toLowerCase()); return r ? `${r.express_delivery_rate} ${r.currency} — Est. 3 weeks` : 'Est. 3 weeks'; })()}
                                            </Typography.Text>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}
                    <Button
                        type="primary"
                        loading={updatingDelivery}
                        onClick={handleUpdateDeliveryDetails}
                    >
                        Gem Levering
                    </Button>
                </Space>
            </Modal>


        </div>
    );
};

export default MyClassPageSimple;