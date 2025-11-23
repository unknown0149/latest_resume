import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import Card from '../ui/Card'

const SkillGapChart = ({ data, type = 'bar' }) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">No skill gap data available</p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Skill Gap Analysis</h3>
      
      {type === 'bar' ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="skill" tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              cursor={{ fill: 'rgba(96, 165, 250, 0.1)' }}
            />
            <Legend />
            <Bar dataKey="current" fill="#60a5fa" name="Your Level" radius={[8, 8, 0, 0]} />
            <Bar dataKey="required" fill="#86efac" name="Required Level" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: '#6b7280', fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Radar name="Your Level" dataKey="current" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.6} />
            <Radar name="Required Level" dataKey="required" stroke="#86efac" fill="#86efac" fillOpacity={0.6} />
            <Legend />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {/* Skill Details */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            Skills You Have
          </h4>
          <ul className="space-y-2">
            {data.filter(s => s.current >= s.required * 0.7).map((skill, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {skill.skill}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            Skills to Improve
          </h4>
          <ul className="space-y-2">
            {data.filter(s => s.current < s.required * 0.7).map((skill, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                {skill.skill}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

export default SkillGapChart
