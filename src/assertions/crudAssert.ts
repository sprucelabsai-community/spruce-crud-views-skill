import {
    MockActiveRecordCard,
    renderUtil,
    SkillViewController,
    SkillViewControllerId,
    vcAssert,
} from '@sprucelabs/heartwood-view-controllers'
import {
    EventContract,
    EventName,
    SkillEventContract,
} from '@sprucelabs/mercury-types'
import { assertOptions } from '@sprucelabs/schema'
import { ViewFixture } from '@sprucelabs/spruce-test-fixtures'
import { assert, RecursivePartial } from '@sprucelabs/test-utils'
import DetailSkillViewController, {
    DetailSkillViewControllerOptions,
    DetailSkillViewEntity,
} from '../detail/DetailSkillViewController'
import MasterListCardViewController from '../master/MasterListCardViewController'
import MasterSkillViewController, {
    MasterSkillViewControllerOptions,
    MasterSkillViewListEntity,
} from '../master/MasterSkillViewController'

let views: ViewFixture | undefined

const crudAssert = {
    beforeEach(viewFixture: ViewFixture) {
        assertOptions(
            { viewFixture },
            ['viewFixture'],
            `You gotta call me like this: crudAssert.beforeEach(this.views)`
        )

        views = viewFixture
        views.setController('active-record-card', MockActiveRecordCard)
    },

    skillViewRendersMasterView(
        skillView: SkillViewController,
        expectedOptions?: Partial<MasterSkillViewControllerOptions>
    ) {
        assertBeforeEachRan()

        assertViewSetToFactory(
            'crud.master-skill-view',
            'MasterSkillViewController'
        )

        assertViewSetToFactory(
            'crud.master-list-card',
            'MasterListCardViewController'
        )

        assertOptions({ skillView }, ['skillView'])

        const rendered = renderUtil.render(skillView)
        let vc: SpyMasterSkillView | undefined

        try {
            vc = vcAssert.assertControllerInstanceOf(
                rendered.controller!,
                MasterSkillViewController
            ) as SpyMasterSkillView
        } catch {
            assert.fail(`You are not rendering a MasterSkillViewController. Follow these steps:
1. In your constructor (after setting the Views to the ViewFactory): this.masterSkillView = this.Controller('crud.master-skill-view',{}).
2. Fix the errors with stub data
3. Update your SkillView's render method: 
    public render(): SkillView { 
        return this.masterSkillView.render() 
    }`)
        }

        if (expectedOptions?.clickRowDestination) {
            assert.isEqual(
                vc?.clickRowDestination,
                expectedOptions.clickRowDestination,
                `The expected options do not match!`
            )
        }
    },

    async skillViewLoadsMasterView(skillView: SkillViewController) {
        assertBeforeEachRan()

        assertOptions({ skillView }, ['skillView'])

        await views?.load(skillView)

        const rendered = renderUtil.render(skillView)
        const controller = rendered.controller as SpyMasterSkillView

        assert.isTrue(
            controller.wasLoaded,
            `You are not loading your MasterSkillViewController on the the load of your SkillView. Follow these steps:
			
1. Make sure your load(...) method signature of your SkillView is 'public async load(options: SkillViewControllerLoadOptions) {...}'
2. In your SkillView's load(...) method, add: await this.masterSkillView.load(options)`
        )
    },

    async masterSkillViewRendersList<
        Contract extends EventContract = SkillEventContract,
        Fqen extends EventName<Contract> = EventName<Contract>,
    >(
        skillView: SkillViewController,
        id: string,
        expectedOptions?: ExpectedListEntityOptions<Contract, Fqen>
    ) {
        assertBeforeEachRan()
        assertOptions({ skillView, id }, ['skillView', 'id'])

        let spyMasterListCard: SpyMasterListCard | undefined

        try {
            const cardVc = vcAssert.assertSkillViewRendersCard(skillView, id)

            spyMasterListCard = vcAssert.assertRendersAsInstanceOf(
                cardVc,
                MasterListCardViewController
            ) as SpyMasterListCard
        } catch {
            assert.fail(
                `Your MasterSkillView is not rendering a list card for the entity with the id of '${id}'.`
            )
        }

        if (expectedOptions) {
            assert.doesInclude(
                spyMasterListCard?.entity,
                expectedOptions,
                'Your configuration does not match!'
            )
        }

        return spyMasterListCard!
    },

    async masterListCardRendersRow(
        skillView: SkillViewController,
        listCardId: string,
        rowId: string
    ) {
        assertBeforeEachRan()
        assertOptions(
            {
                skillView,
                listCardId,
                rowId,
            },
            ['skillView', 'listCardId', 'rowId']
        )

        const cardListVc = await this.masterSkillViewRendersList(
            skillView,
            listCardId
        )

        await views?.load(skillView)

        cardListVc.activeRecordCardVc.assertRendersRow(rowId)
    },

    async assertListsLoadTargetAfterMasterLoad(
        skillView: SkillViewController,
        listCardId: string,
        expectedTarget?: Record<string, any>
    ) {
        assertBeforeEachRan()

        assertOptions(
            {
                skillView,
                listCardId,
                expectedTarget,
            },
            ['skillView', 'listCardId', 'expectedTarget']
        )

        await views?.load(skillView)

        const cardListVc = await this.masterSkillViewRendersList(
            skillView,
            listCardId
        )

        assert.isEqualDeep(
            cardListVc.activeRecordCardVc.getTarget(),
            expectedTarget,
            `The target of list ${listCardId} is not being set to the expected value. Try 'this.masterSkillView.setListTarget(...)'`
        )
    },

    skillViewRendersDetailView(
        skillView: SkillViewController,
        options?: Partial<DetailSkillViewControllerOptions>
    ) {
        assertBeforeEachRan()

        assertViewSetToFactory(
            'crud.detail-skill-view',
            'DetailSkillViewController'
        )

        assertViewSetToFactory(
            'crud.detail-form-card',
            'DetailFormCardViewController'
        )

        assertOptions(
            {
                skillView,
            },
            ['skillView']
        )

        const rendered = renderUtil.render(skillView)
        let vc: SpyDetailSkillView | undefined

        try {
            vc = vcAssert.assertControllerInstanceOf(
                rendered.controller!,
                DetailSkillViewController
            ) as SpyDetailSkillView
        } catch {
            assert.fail(`You are not rendering a DetailSkillViewController. Follow these steps:
1. In your constructor (after setting the Views to the ViewFactory): this.detailSkillView = this.Controller('crud.master-detail-view',{}).
2. Fix the errors with stub data
3. Update your SkillView's render method: 
    public render(): SkillView { 
        return this.detailSkillView.render() 
    }`)
        }

        if (options) {
            assert.doesInclude(
                {
                    cancelDestination: vc?.cancelDestination,
                    entities: vc?.entities,
                },
                options,
                `The options you passed to your DetailSkillView don't match the expected options.`
            )
        }
    },
}

export default crudAssert
function assertViewSetToFactory(id: string, className: string) {
    assert.isTrue(
        views?.getFactory().hasController(id),
        `You need to drop the '${id}' SkillView into the ViewFactory. Here's how:
		
1. Import the ${className} into your SkillView: import { ${className} } from '@sprucelabsai-community/spruce-crud-views-utils'.
2. Drop in the Controller in your SkillView's constructor: this.getVcFactory().setController('${id}', ${className}).`
    )
}

function assertBeforeEachRan() {
    assert.isTruthy(
        views,
        `You need to call crudAssert.beforeEach(this.views) in your test. You gotta do that before you can use this assertion library.`
    )
}

class SpyMasterSkillView extends MasterSkillViewController {
    public wasLoaded = false
    public clickRowDestination?: SkillViewControllerId
}

class SpyMasterListCard extends MasterListCardViewController {
    public entity!: MasterSkillViewListEntity
    public activeRecordCardVc!: MockActiveRecordCard
}

class SpyDetailSkillView extends DetailSkillViewController {
    public cancelDestination!: SkillViewControllerId
    public entities!: DetailSkillViewEntity[]
}

export type ExpectedListEntityOptions<
    Contract extends EventContract = SkillEventContract,
    Fqen extends EventName<Contract> = EventName<Contract>,
> = Omit<RecursivePartial<MasterSkillViewListEntity<Contract, Fqen>>, 'id'>
