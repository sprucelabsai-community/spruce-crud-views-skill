import { MockActiveRecordCard } from '@sprucelabs/heartwood-view-controllers'
import { AbstractSpruceFixtureTest } from '@sprucelabs/spruce-test-fixtures'
import CrudDetailFormCardViewController from '../../detail/CrudDetailFormCardViewController'
import CrudDetailSkillViewController from '../../detail/CrudDetailSkillViewController'
import EventFaker from './EventFaker'
import MockCrudListCard from './MockCrudListCard'
import SpyMasterSkillView from './SpyMasterSkillView'
import { buildLocationListEntity } from './test.utils'

export default abstract class AbstractCrudTest extends AbstractSpruceFixtureTest {
    protected static eventFaker: EventFaker

    protected static async beforeEach() {
        await super.beforeEach()

        this.views.setController('active-record-card', MockActiveRecordCard)
        this.views.setController('crud.master-skill-view', SpyMasterSkillView)
        this.views.setController('crud.list-card', MockCrudListCard)
        this.views.setController(
            'crud.detail-skill-view',
            CrudDetailSkillViewController
        )
        this.views.setController(
            'crud.detail-form-card',
            CrudDetailFormCardViewController
        )

        this.eventFaker = new EventFaker()
    }

    protected static buildLocationListEntities(total: number) {
        return Array.from({ length: total }, () =>
            this.buildLocationListEntity()
        )
    }

    protected static buildLocationListEntity(id?: string) {
        return buildLocationListEntity(id)
    }
}
