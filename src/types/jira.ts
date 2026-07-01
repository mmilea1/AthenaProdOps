export interface JiraFeature {
  id: string
  key: string
  summary: string
  status: {
    name: string
    category: string
  }
  scopingStatus: string | null
  targetGARelease: string | null
  uncommittedReview: string | null
  assignee: string | null
  url: string
}

export interface ReleaseGroup {
  releaseName: string
  features: JiraFeature[]
}
