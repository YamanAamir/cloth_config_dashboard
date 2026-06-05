import React, { useState, useEffect } from 'react';
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
    EditOutlined
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
    setStudyTripCountry
} from '../api/api';
import { getUploadsUrl, Status } from '../utils/constants';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const STATUS_CONFIG = {
    [Status.ACTIVE]: {
        label: 'Approved ',
        color: 'success',
        icon: <CheckCircleOutlined />,
        description: 'Your design has been approved!'
    },
    [Status.INACTIVE]: {
        label: 'Under Review',
        color: 'processing',
        icon: <ClockCircleOutlined />,
        description: 'We are reviewing your design'
    },
    [Status.DELETED]: {
        label: 'Needs Changes',
        color: 'error',
        icon: <CloseCircleOutlined />,
        description: 'Please upload a new design'
    },
};

const MyClassPageSimple = () => {
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
    const [expectedCount, setExpectedCount] = useState(0);
    const [updatingCount, setUpdatingCount] = useState(false);

    // Study Trip
    const [studyTripModalOpen, setStudyTripModalOpen] = useState(false);
    const [studyTripCountries, setStudyTripCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [settingCountry, setSettingCountry] = useState(false);

    // Fetch all data
    const fetchAllData = async (showMessage = false) => {
        if (showMessage) setRefreshing(true);
        try {
            // First get class and logos
            const [classRes, logosRes] = await Promise.all([
                getMyClass(),
                getMyLogos({ page: 1, limit: 10 })
            ]);

            const classData = classRes.data.data?.[0];
            setMyClass(classData);
            setLogos(logosRes.data?.data || []);

            // Then get student count if class exists
            if (classData?.id) {
                try {
                    const studentCountRes = await getClassRepStudentCount(classData.id);
                    console.log('Student count response:', studentCountRes.data); // Debug log
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

    useEffect(() => {
        fetchAllData();
        fetchStudyTripCountries();
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

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                    <Text>Loading your class information...</Text>
                </div>
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
                    {myClass.school?.name} • Class of {myClass.graduation_year}
                </Text>
            </div>



            {/* Main Actions */}
            <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
                {/* Student Registration */}
                <Col xs={24} md={12} lg={8}>
                    <Card
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
                                Students
                            </Title>
                            <Text type="secondary">
                                Share link & track registrations
                            </Text>
                        </div>

                        <Divider />

                        {/* Count */}
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 20 }}>
                                {studentCount?.registered_students || 0}
                            </Text>
                            <Text type="secondary"> / {studentCount?.expected_students || 'Set target'}</Text>
                        </div>

                        {/* Progress */}
                        {/* {studentCount?.expected_students && (
                            <Progress
                                percent={Math.round(studentCount.completion_percentage || 0)}
                                strokeColor={{
                                    '0%': '#ff4d4f',
                                    '80%': '#faad14',
                                    '100%': '#52c41a'
                                }}
                                style={{ marginBottom: 16 }}
                            />
                        )} */}

                        {/* <Divider /> */}

                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <Button
                                type="primary"
                                icon={<LinkOutlined />}
                                onClick={handleGenerateLink}
                                loading={linkLoading}
                                style={{ flex: 1 }}
                            >
                                Get Link
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
                                <span>Expected: {studentCount?.expected_students || 'Set'}</span>
                                <EditOutlined />
                            </Button>
                        </div>
                    </Card>
                </Col>

                {/* Upload Logo */}
                <Col xs={24} md={12} lg={8}>
                    <Card
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
                                Upload Logo
                            </Title>
                            <Text type="secondary">
                                Class logo for graduation items
                            </Text>
                        </div>

                        <Divider />

                        {/* Logo Status */}
                        <div style={{ marginBottom: 16, textAlign: 'center' }}>
                            {logos.length > 0 ? (
                                <Tag color="success">
                                    {logos.length} Logo{logos.length > 1 ? 's' : ''}
                                </Tag>
                            ) : (
                                <Tag color="default">No logos yet</Tag>
                            )}
                        </div>

                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setUploadModalOpen(true)}
                            block
                        >
                            Upload Logo
                        </Button>


                    </Card>
                </Col>
                <Col xs={24} md={12} lg={8}>
                    <Card
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
                                Study Trip
                            </Title>
                            <Text type="secondary">
                                Select destination country
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
                                <Tag color="default">No country selected</Tag>
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
                            {myClass?.country ? 'Change Country' : 'Select Country'}
                        </Button>
                    </Card>
                </Col>



            </Row>
            {/* All Logos */}
            {logos.length > 1 && (
                <Card
                    title="All Your Logos"
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
                title="Current Status"
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
                            <Title level={5} style={{ marginBottom: 16 }}>Back Design</Title>
                            {backDesign ? (
                                <div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <Image
                                            src={getUploadsUrl(backDesign.file_path)}
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
                                                Configurator Design
                                            </Tag>
                                            {backDesign.configurator_state.textElements && (
                                                <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                                                    {backDesign.configurator_state.textElements.length} text elements
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
                                    description="No back design selected yet"
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
                            <Title level={5} style={{ marginBottom: 16 }}>Latest Logo</Title>
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
                                    description="No logos uploaded yet"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            )}
                        </div>
                    </Col>
                </Row>
            </Card>



            {/* Registration Link Modal */}
            <Modal
                title="Share This Link With Your Classmates"
                open={linkModalOpen}
                onCancel={() => setLinkModalOpen(false)}
                footer={null}
                width={600}
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Paragraph>
                        Send this link to your classmates so they can register and order their graduation items:
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
                        Copy Link
                    </Button>
                </div>
            </Modal>

            {/* Upload Modal */}
            <Modal
                title="Upload Class Logo"
                open={uploadModalOpen}
                onCancel={() => {
                    setUploadModalOpen(false);
                    setSelectedFile(null);
                    setLogoName('');
                }}
                footer={null}
                width={500}
            >
                <div style={{ padding: '20px 0' }}>
                    {/* <div style={{ 
                        background: '#f6ffed', 
                        border: '1px solid #b7eb8f', 
                        borderRadius: 6, 
                        padding: 12, 
                        marginBottom: 16 
                    }}>
                        <Typography.Text strong style={{ color: '#389e0d', display: 'block', marginBottom: 4 }}>
                            📏 A3 Size Requirements
                        </Typography.Text>
                        <Typography.Text style={{ fontSize: 12, color: '#52c41a' }}>
                            • Maximum: 4000 × 5600 pixels (A3 at 300 DPI)<br/>
                            • Recommended: 2480 × 3508 pixels (A3 at 210 DPI)<br/>
                            • How to check: Right-click image → Properties → Details<br/>
                            • File size: Maximum 5MB
                        </Typography.Text>
                    </div> */}

                    <Paragraph>
                        Upload a high-quality image of your class logo. We'll review it and approve it for use on graduation items.
                    </Paragraph>

                    {/* Name Input */}
                    <div style={{ marginBottom: 16 }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Logo Name *
                        </Typography.Text>
                        <Input
                            placeholder="Enter logo name (e.g. School Logo 2025)"
                            value={logoName}
                            onChange={(e) => setLogoName(e.target.value)}
                            maxLength={100}
                            showCount
                            disabled={uploading}
                        />
                    </div>

                    <Dragger
                        accept="image/*"
                        beforeUpload={handleFileSelect}
                        showUploadList={false}
                        disabled={uploading}
                        style={{
                            borderColor: selectedFile ? '#52c41a' : '#d9d9d9',
                            backgroundColor: selectedFile ? '#f6ffed' : '#fafafa'
                        }}
                    >
                        <p className="ant-upload-drag-icon">
                            <UploadOutlined style={{
                                fontSize: '48px',
                                color: selectedFile ? '#52c41a' : '#1890ff'
                            }} />
                        </p>
                        <p className="ant-upload-text" style={{
                            color: selectedFile ? '#52c41a' : undefined,
                            fontWeight: selectedFile ? 'bold' : 'normal'
                        }}>
                            {selectedFile ? '✓ File Selected - Click or drag to change' :
                                'Click or drag image here to select'}
                        </p>
                        <p className="ant-upload-hint">
                            Max: 5MB • JPG/PNG/GIF
                        </p>
                    </Dragger>

                    {/* Upload Button and File Name */}
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Upload
                            accept="image/*"
                            beforeUpload={handleFileSelect}
                            showUploadList={false}
                            disabled={uploading}
                        >
                            {/* <Button
                                icon={<UploadOutlined />}
                                disabled={uploading}
                            >
                                Choose File
                            </Button> */}
                        </Upload>
                        {selectedFile && (
                            <Text type="success" style={{ fontSize: 14 }}>
                                📁 {selectedFile.name}
                            </Text>
                        )}
                    </div>

                    {/* Manual Upload Button */}
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Button
                            type="primary"
                            size="large"
                            loading={uploading}
                            onClick={handleManualUpload}
                            disabled={!selectedFile || !logoName.trim()}
                            style={{ minWidth: 120, color: 'white' }}
                        >
                            {uploading ? 'Uploading...' : 'Upload Logo'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Expected Students Modal */}
            <Modal
                title="How Many Students Are Expected?"
                open={expectedStudentsModalOpen}
                onOk={handleUpdateExpectedCount}
                onCancel={() => setExpectedStudentsModalOpen(false)}
                confirmLoading={updatingCount}
                okText="Save"
            >
                <div style={{ padding: '20px 0' }}>
                    <Paragraph>
                        Tell us how many students you expect in your class. This helps us track registration progress.
                    </Paragraph>
                    <Input
                        type="number"
                        placeholder="Enter number of expected students"
                        value={expectedCount}
                        onChange={(e) => setExpectedCount(parseInt(e.target.value) || 0)}
                        min={1}
                        max={1000}
                        size="large"
                    />
                    {studentCount ? (
                        <div style={{ marginTop: '12px' }}>
                            <Text type="secondary">
                                Currently registered: {studentCount.registered_students || 0} students
                            </Text>
                        </div>
                    ) : (
                        <div style={{ marginTop: '12px' }}>
                            <Text type="secondary">
                                Loading current registration count...
                            </Text>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Study Trip Modal */}
            <Modal
                title="Select Study Trip Country"
                open={studyTripModalOpen}
                onOk={handleSetStudyTripCountry}
                onCancel={() => setStudyTripModalOpen(false)}
                confirmLoading={settingCountry}
                okText="Save Country"
                width={500}
            >
                <div style={{ padding: '20px 0' }}>
                    <Paragraph>
                        Choose the country for your class study trip. This will be used for graduation designs and planning.
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
                                                ? '#e6f4ff'
                                                : '#fff',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <Text
                                            strong
                                            style={{
                                                fontSize: '13px',
                                                textAlign: 'center',
                                            }}
                                        >
                                            {country.name}
                                        </Text>

                                        {/* {selectedCountry === country.id && (
                                            <CheckCircleOutlined
                                                style={{ color: '#52c41a', fontSize: '16px' }}
                                            />
                                        )} */}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Empty
                            description="No countries available"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default MyClassPageSimple;