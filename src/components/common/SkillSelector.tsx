import { useMemo, useState } from 'react'
import { Button } from '../ui/Button'

const skillCategories = [
  'all',
  'frontend',
  'backend',
  'mobile',
  'database',
  'ai',
  'devops',
  'collaboration',
  'design',
  'game',
  'language',
] as const

type SkillCategoryFilter = (typeof skillCategories)[number]

interface SkillItem {
  id: number
  name: string
  category: string | null
}

interface SkillSelectorProps {
  skills: SkillItem[]
  selectedSkillIds: number[]
  onSelectSkill: (skillId: number) => void
  onDeselectSkill: (skillId: number) => void
  showSelectedList?: boolean
  emptySelectedMessage?: string
}

export function SkillSelector({
  skills,
  selectedSkillIds,
  onSelectSkill,
  onDeselectSkill,
  showSelectedList = true,
  emptySelectedMessage = '선택된 스킬이 없습니다.',
}: SkillSelectorProps) {
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<SkillCategoryFilter>('all')
  const [skillSearch, setSkillSearch] = useState('')
  const [newSkillId, setNewSkillId] = useState('')

  const availableSkills = useMemo(() => {
    const normalizedKeyword = skillSearch.trim().toLowerCase()

    return skills.filter((skill) => {
      const isSelected = selectedSkillIds.includes(skill.id)
      const matchesCategory =
        skillCategoryFilter === 'all' || (skill.category ?? '').toLowerCase() === skillCategoryFilter
      const matchesKeyword =
        normalizedKeyword.length === 0 || skill.name.toLowerCase().includes(normalizedKeyword)

      return !isSelected && matchesCategory && matchesKeyword
    })
  }, [selectedSkillIds, skillCategoryFilter, skillSearch, skills])

  const selectedSkills = useMemo(
    () => skills.filter((skill) => selectedSkillIds.includes(skill.id)),
    [selectedSkillIds, skills],
  )

  function handleAddSkill() {
    if (!newSkillId) return

    const parsedSkillId = Number(newSkillId)
    if (!Number.isFinite(parsedSkillId)) return
    if (selectedSkillIds.includes(parsedSkillId)) return

    onSelectSkill(parsedSkillId)
    setNewSkillId('')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-campus-200 bg-campus-50 p-4">
        <div className="grid gap-3 md:grid-cols-[180px,1fr]">
          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>카테고리</span>
            <select
              value={skillCategoryFilter}
              onChange={(event) => setSkillCategoryFilter(event.target.value as SkillCategoryFilter)}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            >
              <option value="all">전체</option>
              <option value="frontend">프론트엔드</option>
              <option value="backend">백엔드</option>
              <option value="mobile">모바일</option>
              <option value="database">데이터베이스</option>
              <option value="ai">AI</option>
              <option value="devops">데브옵스</option>
              <option value="collaboration">협업</option>
              <option value="design">디자인</option>
              <option value="game">게임</option>
              <option value="language">언어</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>스킬 검색</span>
            <input
              value={skillSearch}
              onChange={(event) => setSkillSearch(event.target.value)}
              placeholder="예: React, PyTorch"
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 space-y-2 text-sm font-medium text-campus-700">
            <span>스킬</span>
            <select
              value={newSkillId}
              onChange={(event) => setNewSkillId(event.target.value)}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            >
              <option value="">스킬을 선택해 주세요</option>
              {availableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                  {skill.category ? ` · ${skill.category}` : ''}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={handleAddSkill} disabled={!newSkillId}>
            추가
          </Button>
        </div>

        <p className="text-xs text-campus-500">추가 가능한 스킬: {availableSkills.length}개</p>
      </div>

      {showSelectedList && (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {selectedSkills.length === 0 ? (
            <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-6 text-sm text-campus-500">
              {emptySelectedMessage}
            </div>
          ) : (
            selectedSkills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => onDeselectSkill(skill.id)}
                className="flex w-full flex-col gap-2 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-left transition hover:bg-brand-50 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-campus-900">{skill.name}</p>
                  <p className="text-sm text-campus-500">{skill.category ?? '분류 없음'}</p>
                </div>
                <span className="text-sm font-medium text-brand-600">선택됨 · 클릭 해제</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
