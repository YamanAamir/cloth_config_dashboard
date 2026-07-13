import React, { useState, useEffect } from 'react';
import { Card, Typography, Input, Breadcrumb, message, Row, Col, Divider, Avatar } from 'antd';
import { BankOutlined, AppstoreOutlined, TeamOutlined, HomeOutlined, UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { getAllSchools, getClassStudents, getSchoolClasses, getClassRep } from '../api/api';
import SchoolList from '../components/overview/SchoolList';
import ClassList from '../components/overview/ClassList';
import StudentList from '../components/overview/StudentList';

const { Title, Text } = Typography;

const SchoolOverviewPage = () => {
    const [schools, setSchools] = useState([]);
    const [schoolsLoading, setSchoolsLoading] = useState(false);
    const [schoolSearch, setSchoolSearch] = useState('');
    const [selectedSchool, setSelectedSchool] = useState(null);

    const [classes, setClasses] = useState([]);
    const [classesLoading, setClassesLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);

    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [classRepData, setClassRepData] = useState(null);

    const fetchSchools = async (search = '') => {
        setSchoolsLoading(true);
        try {
            const res = await getAllSchools({ page: 1, limit: 100, search });
            setSchools(res.data.data || []);
        } catch { message.error('Failed to load schools'); }
        finally { setSchoolsLoading(false); }
    };

    const fetchClasses = async (schoolId) => {
        setClassesLoading(true);
        setClasses([]); setSelectedClass(null); setStudents([]); setClassRepData(null);
        try {
            const res = await getSchoolClasses(schoolId, { page: 1, limit: 100 });
            setClasses(res.data.data || []);
        } catch { message.error('Failed to load classes'); }
        finally { setClassesLoading(false); }
    };

    const fetchStudents = async (classId) => {
        setStudentsLoading(true);
        setStudents([]); setClassRepData(null);
        try {
            const [studRes, repRes] = await Promise.all([
                getClassStudents(classId, { page: 1, limit: 100 }),
                getClassRep(classId)
            ]);
            setStudents(studRes.data.data || []);
            setClassRepData(repRes.data.data || null);
        } catch(e) { message.error(e.response.data.message || 'Failed to load students'); }
        finally { setStudentsLoading(false); }
    };

    useEffect(() => { fetchSchools(); }, []);
    useEffect(() => {
        const t = setTimeout(() => fetchSchools(schoolSearch), 400);
        return () => clearTimeout(t);
    }, [schoolSearch]);

    const handleSelectSchool = (school) => { setSelectedSchool(school); fetchClasses(school.id); };
    const handleSelectClass = (cls) => { setSelectedClass(cls); fetchStudents(cls.id); };

    const breadcrumbs = [
        { title: <span onClick={() => { setSelectedSchool(null); setSelectedClass(null); setClasses([]); setStudents([]); }} style={{ cursor: 'pointer', color: '#1890ff' }}><HomeOutlined /> Schools</span> },
        ...(selectedSchool ? [{ title: <span onClick={() => { setSelectedClass(null); setStudents([]); setClassRepData(null); }} style={{ cursor: 'pointer', color: '#1890ff' }}><BankOutlined /> {selectedSchool.name}</span> }] : []),
        ...(selectedClass ? [{ title: <span style={{ color: '#595959' }}><AppstoreOutlined /> {selectedClass.name}</span> }] : []),
    ];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>School Overview</Title>
                <Text type="secondary">Schools → Classes → Students</Text>
            </div>

            <Breadcrumb items={breadcrumbs} style={{ marginBottom: 16 }} />

            {/* Schools */}
            <Card className="glass-card" style={{ border: 'none', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong><BankOutlined style={{ color: '#1890ff', marginRight: 6 }} />Schools ({schools.length})</Text>
                    <Input.Search placeholder="Search school" allowClear style={{ width: 220 }}
                        value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)} />
                </div>
                <SchoolList schools={schools} loading={schoolsLoading} selectedId={selectedSchool?.id} onSelect={handleSelectSchool} />
            </Card>

            {/* Classes */}
            {selectedSchool && (
                <Card className="glass-card" style={{ border: 'none', marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>
                        <AppstoreOutlined style={{ color: '#722ed1', marginRight: 6 }} />
                        Classes in {selectedSchool.name} ({classes.length})
                    </Text>
                    <ClassList classes={classes} loading={classesLoading} selectedId={selectedClass?.id} onSelect={handleSelectClass} />
                </Card>
            )}

            {/* Students + Class Rep */}
            {selectedClass && (
                <Card className="glass-card" style={{ border: 'none' }}>
                    <Row gutter={[16, 16]}>
                        {/* Class Rep Card */}
                        {classRepData && (
                            <Col xs={24} md={6}>
                                <Card style={{ background: '#f0f7ff', border: '1px solid #91d5ff', borderRadius: 10 }} bodyStyle={{ padding: 16 }}>
                                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                        <Avatar size={48} style={{ background: '#1890ff', marginBottom: 8 }} icon={<UserOutlined />} />
                                        <Text strong style={{ display: 'block', fontSize: 14 }}>{classRepData.name}</Text>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Class Representative</Text>
                                    </div>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <MailOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                                            <Text style={{ fontSize: 12 }} copyable={{ text: classRepData.email }}>{classRepData.email}</Text>
                                        </div>
                                        {classRepData.phone_number && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <PhoneOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                                                <Text style={{ fontSize: 12 }}>{classRepData.phone_number}</Text>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </Col>
                        )}

                        {/* Students Table */}
                        <Col xs={24} md={classRepData ? 18 : 24}>
                            <Text strong style={{ display: 'block', marginBottom: 12 }}>
                                <TeamOutlined style={{ color: '#00b96b', marginRight: 6 }} />
                                Students in {selectedClass.name} ({students.length})
                            </Text>
                            <StudentList students={students} loading={studentsLoading} />
                        </Col>
                    </Row>
                </Card>
            )}
        </div>
    );
};

export default SchoolOverviewPage;
