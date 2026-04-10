import { useEffect, useState } from 'react';
import SkillBadge from './SkillBadge';

const VerifiedSkills = ({ userId }) => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchVerifiedSkills();
    }
  }, [userId]);

  const fetchVerifiedSkills = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${backendUrl}/api/profile/${userId}/skills`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      }
    } catch (error) {
      console.error('Error fetching verified skills:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  if (skills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, index) => (
        <SkillBadge
          key={index}
          skill={skill.name}
          verified={skill.verified}
          source={skill.source}
        />
      ))}
    </div>
  );
};

export default VerifiedSkills;
