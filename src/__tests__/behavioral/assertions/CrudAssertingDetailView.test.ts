import {
    AbstractSkillViewController,
    SkillView,
    SkillViewControllerId,
    SkillViewControllerLoadOptions,
} from '@sprucelabs/heartwood-view-controllers'
import { SkillEventContract, SpruceSchemas } from '@sprucelabs/mercury-types'
import { fake, seed } from '@sprucelabs/spruce-test-fixtures'
import {
    test,
    assert,
    errorAssert,
    generateId,
    RecursivePartial,
} from '@sprucelabs/test-utils'
import crudAssert, {
    AssertDetailLoadTargetPayloadOptions,
} from '../../../assertions/crudAssert'
import CrudDetailSkillViewController, {
    CrudDetailSkillViewArgs,
    CrudDetailEntity,
    DetailSkillViewControllerOptions,
} from '../../../detail/CrudDetailSkillViewController'
import { CrudListEntity } from '../../../master/CrudMasterSkillViewController'
import { buildLocationDetailEntity as buildLocationDetailTestEntity } from '../../support/test.utils'
import AbstractAssertTest from './AbstractAssertTest'

@fake.login()
export default class CrudAssertingDetailViewTest extends AbstractAssertTest {
    private static vc: SkillViewWithDetailView
    private static entities: CrudDetailEntity[]
    private static recordId?: string

    @seed('locations', 2)
    protected static async beforeEach(): Promise<void> {
        await super.beforeEach()

        this.entities = []
        this.views.setController('fake-with-detail', SkillViewWithDetailView)
        this.vc = this.views.Controller('fake-with-detail', {})
        this.recordId = this.fakedLocations[0].id
    }

    @test()
    protected static async rendersDetailViewThrowsWithMissing() {
        const err = assert.doesThrow(() =>
            //@ts-ignore
            crudAssert.skillViewRendersDetailView()
        )

        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['skillView'],
        })
    }

    @test()
    protected static async throwsIfDetailViewNotSetInFactory() {
        this.assertRendersDetailThrowsWithMissingView(
            'crud.detail-skill-view',
            'DetailSkillViewController'
        )
    }

    @test()
    protected static async throwsIfDetailFormNetSetInFactory() {
        this.assertRendersDetailThrowsWithMissingView(
            'crud.detail-form-card',
            'DetailFormCardViewController'
        )
    }

    @test()
    protected static async throwsIfSkillViewIsNotRenderingDetailView() {
        assert.doesThrow(
            () => crudAssert.skillViewRendersDetailView(this.vc),
            'not rendering'
        )
    }

    @test()
    protected static async assertSkillViewRenderingDetailView() {
        this.dropInDetailSkillView()
        this.assertRendersDetailView()
    }

    @test()
    protected static async assertSkillViewRendersDetailThrowsWithMissmatchCancelDestination() {
        this.dropInDetailSkillView()
        this.assertRendersDetailFewThrowsForMissmatchedOptions({
            cancelDestination: `crud.master-skill-view`,
        })
    }

    @test('asserts matches cancel destination crud.root', 'crud.root')
    @test(
        'asserts matches cancel destination crud.master-skill-view',
        'crud.master-skill-view'
    )
    protected static async assertMatchesCancelDestination(
        id: SkillViewControllerId
    ) {
        this.dropInDetailSkillView({ cancelDestination: id })
        this.assertRendersDetailView({
            cancelDestination: id,
        })
    }

    @test()
    protected static async throwsIfEntitiesDontMatch() {
        this.dropInDetailSkillView()
        this.assertRendersDetailFewThrowsForMissmatchedOptions({
            entities: [buildLocationDetailTestEntity()],
        })
    }

    @test()
    protected static async passesIfEntitiesMatch() {
        const entities = [
            buildLocationDetailTestEntity(),
            buildLocationDetailTestEntity(),
        ]
        this.dropInDetailSkillView({ entities })
        this.assertRendersDetailView({ entities })
    }

    @test()
    protected static async detailIsLoadedThrowsWithMissing() {
        const err = await assert.doesThrowAsync(() =>
            //@ts-ignore
            crudAssert.skillViewLoadsDetailView()
        )

        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['skillView'],
        })
    }

    @test()
    protected static async detailThrowsIfNotLoaded() {
        this.dropInDetailSkillView()
        this.vc.shouldLoad = false
        await assert.doesThrowAsync(
            () => crudAssert.skillViewLoadsDetailView(this.vc),
            'not loading'
        )
    }

    @test()
    protected static async throwsIfLoadDoesNotTriggerRender() {
        this.dropInDetailSkillView()
        this.vc.shouldTriggerRenderOnLoad = false
        await assert.doesThrowAsync(
            () => crudAssert.skillViewLoadsDetailView(this.vc),
            'triggerRender'
        )
    }

    @test()
    protected static async passesWhenLoadedOnLoad() {
        this.dropInDetailSkillView()
        await crudAssert.skillViewLoadsDetailView(this.vc)
    }

    @test()
    protected static async assertLoadTargetAndPayloadThrowsWithMissing() {
        this.dropInDetailSkillView()
        const err = await assert.doesThrowAsync(() =>
            //@ts-ignore
            crudAssert.detailLoadTargetAndPayloadEquals()
        )

        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['skillView', 'entityId', 'recordId'],
        })
    }

    @test()
    protected static async assertLoadTargetAndPayloadThrowsWithoutOneOrTheOther() {
        this.dropInDetailSkillView()
        const err = await assert.doesThrowAsync(() =>
            crudAssert.detailLoadTargetAndPayloadEquals({
                skillView: this.vc,
                entityId: generateId(),
                recordId: generateId(),
            })
        )

        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['expectedTarget', 'expectedPayload'],
        })
    }

    @test()
    protected static async throwsIfTargetDoesNotMatchLocationId() {
        await this.eventFaker.fakeGetLocation()
        this.dropInDetailSkillView()
        await this.assertLoadTargetAndPayloadDoNotMatch({
            locationId: generateId(),
        })
    }

    @test()
    protected static async throwsIfTargetDoesNotMatchOrganizationId() {
        await this.eventFaker.fakeGetOrganization()
        const entity = buildLocationDetailTestEntity()
        entity.load = {
            buildTarget: async () => {
                return { organizationId: generateId() }
            },
            fqen: 'get-organization::v2020_12_25',
            responseKey: 'organization',
        }

        this.dropInDetailSkillView({
            entities: [entity],
        })

        await this.assertLoadTargetAndPayloadDoNotMatch({
            organizationId: generateId(),
        })
    }

    @test()
    protected static async loadTargetMatchesExpectedForLocationId() {
        const entity = buildLocationDetailTestEntity()

        entity.load.buildTarget = async (recordId) => {
            return { locationId: recordId }
        }

        this.dropInDetailSkillView({
            entities: [{ ...entity }],
        })

        await this.assertDetailLoadTargetAndPayloadEquals({
            recordId: this.locationId,
            expectedTarget: {
                locationId: this.locationId,
            },
        })
    }

    @test()
    protected static async loadTargetMatchesExpectedForOrganizationId() {
        const entity = buildLocationDetailTestEntity()

        entity.load = {
            buildTarget: async (recordId) => {
                return { organizationId: recordId }
            },
            fqen: 'get-organization::v2020_12_25',
            responseKey: 'organization',
        }

        this.dropInDetailSkillView({
            entities: [{ ...entity }],
        })

        const recordId = this.fakedOrganizations[0].id
        const expectedTarget = {
            organizationId: this.fakedOrganizations[0].id,
        }

        await this.assertDetailLoadTargetAndPayloadEquals({
            recordId,
            expectedTarget,
        })
    }

    @test()
    protected static async assertRendersRelatedEntityThrowsWithMissing() {
        const err = await assert.doesThrowAsync(() =>
            //@ts-ignore
            crudAssert.detailRendersRelatedEntity()
        )

        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['skillView', 'entityId', 'relatedId'],
        })
    }

    @test()
    protected static async assertRendersRelatedThrowsIfNoRelated() {
        this.dropInDetailSkillView()

        await assert.doesThrowAsync(
            () =>
                crudAssert.detailRendersRelatedEntity({
                    skillView: this.vc,
                    entityId: generateId(),
                    recordId: this.locationId,
                    relatedId: generateId(),
                }),
            'any related entities on your'
        )
    }

    @test()
    protected static async assertRendersRelatedThrowsIfNoRelatedExists() {
        this.dropInDetailViewWithLocationAndOneRelated()

        await assert.doesThrowAsync(
            () =>
                crudAssert.detailRendersRelatedEntity({
                    skillView: this.vc,
                    entityId: this.firstEntityId,
                    recordId: this.locationId,
                    relatedId: generateId(),
                }),
            'related entity'
        )
    }

    @test()
    protected static async passesIfRelatedEntityExists() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId)
    }

    @test()
    protected static async canFindSecondRelatedEntity() {
        const entity = this.buildLocationDetailEntity()

        entity.relatedEntities = [
            this.buildLocationListEntity(),
            this.buildLocationListEntity(),
        ]

        this.dropInDetailSkillView({
            entities: [entity],
        })

        await this.assertRelatedExistsInFirstEntity(
            this.firstEntity.relatedEntities![1].id
        )
    }

    @test()
    protected static async throwsIfRelatedEntitiesOptionsDontMatch() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertThrowsWhenFirstRelatedOptionsDontMatch({
            pluralTitle: generateId(),
        })
    }

    @test()
    protected static async passesIfRelatedEntityPluralTitleMatches() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId, {
            pluralTitle: this.firstRelatedEntity.pluralTitle,
        })
    }

    @test()
    protected static async passesIfRelatedEntitySingularTitleMatches() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId, {
            singularTitle: this.firstRelatedEntity.singularTitle,
        })
    }

    @test()
    protected static async matchesRelatedTargetAfterLoad() {
        const target = { organizationId: generateId() }

        this.dropInDetailViewWithLocationAndSetFirstRelatedBuiltTarget(target)

        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId, {
            list: {
                target: target as any,
            },
        })
    }

    @test()
    protected static async throwsIfBuiltTargetDoesNotMatch() {
        this.dropInDetailViewWithLocationAndSetFirstRelatedBuiltTarget({
            organizationId: generateId(),
        })

        await this.assertThrowsWhenFirstRelatedOptionsDontMatch({
            list: {
                target: { organizationId: generateId() } as any,
            },
        })
    }

    @test()
    protected static async relatedOptionsCanStillFailEvenIfBuiltTargetMatches() {
        const target = { organizationId: generateId() }
        this.dropInDetailViewWithLocationAndSetFirstRelatedBuiltTarget(target)
        await this.assertThrowsWhenFirstRelatedOptionsDontMatch({
            pluralTitle: generateId(),
            list: {
                target: target as any,
            },
        })
    }

    @test()
    protected static async relatedOptionsCanThrowIfAnotherListPropertyDoesNotMatch() {
        const target = { organizationId: generateId() }
        this.dropInDetailViewWithLocationAndSetFirstRelatedBuiltTarget(target)
        await this.assertThrowsWhenFirstRelatedOptionsDontMatch({
            list: {
                target: target as any,
                paging: {
                    pageSize: 0,
                },
            },
        })
    }

    @test()
    protected static async assertingRelatedOptionsWithBuildTargetPassWithoutTargetInExpected() {
        const target = { organizationId: generateId() }
        this.dropInDetailViewWithLocationAndSetFirstRelatedBuiltTarget(target)
        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId, {
            pluralTitle: this.firstRelatedEntity.pluralTitle,
        })
    }

    @test()
    protected static async passesLoadedEntityToBuildTarget() {
        this.dropInDetailViewWithLocationAndOneRelated()
        let passedValues: Record<string, any> | undefined
        let passedEntityId: string | undefined

        const target = { organizationId: generateId() }

        this.firstRelatedEntity.list.buildTarget = (detailEntityId, values) => {
            passedEntityId = detailEntityId
            passedValues = values
            return target
        }

        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId, {
            list: { target: target as any },
        })

        assert.isEqualDeep(passedValues, this.fakedLocations[0])
        assert.isEqual(passedEntityId, this.firstEntityId)
    }

    @test()
    protected static async canMatchOnTargetWithoutRecordId() {
        const target = { organizationId: generateId() }
        let passedEntity: string | undefined

        this.dropInDetailViewWithLocationAndSetFirstRelatedBuiltTarget(target)
        this.firstRelatedEntity.list.buildTarget = (detailEntityId, values) => {
            assert.isFalsy(values)
            passedEntity = detailEntityId
            return target
        }

        delete this.recordId

        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId, {
            list: {
                target: target as any,
            },
        })

        assert.isEqual(passedEntity, this.firstEntityId)
    }

    @test()
    protected static async rendersRelatedRowThrowsWithMissing() {
        const err = await assert.doesThrowAsync(() =>
            //@ts-ignore
            crudAssert.detailRendersRelatedRow()
        )

        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['skillView', 'entityId', 'relatedId', 'rowId'],
        })
    }

    @test()
    protected static async rendersRelatedRowThrowsWhenNotRenderingDetailView() {
        await this.assertDetailViewRendersRelatedRowThrows({
            entityId: generateId(),
            relatedId: generateId(),
            rowId: generateId(),
            message: 'DetailSkillViewController',
        })
    }

    @test()
    protected static async rendersRelatedRowThrowsWhenEntityIdNotFound() {
        this.dropInDetailSkillView()
        await this.assertDetailViewRendersRelatedRowThrows({
            entityId: generateId(),
            relatedId: generateId(),
            rowId: generateId(),
            message: 'entity',
        })
    }

    @test()
    protected static async rendersRelatedRowThrowsWhenRelatedIdNotFound() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertDetailViewRendersRelatedRowThrows({
            entityId: this.firstEntityId,
            relatedId: generateId(),
            rowId: generateId(),
            message: 'related',
        })
    }

    @test()
    protected static async rendersRelatedRowThrowsWhenRowIdNotFound() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertDetailViewRendersRelatedRowThrows({
            entityId: this.firstEntityId,
            relatedId: this.firstRelatedEntityId,
            rowId: generateId(),
            message: 'row',
        })
    }

    @test()
    protected static async canAssertRendersRelatedRow() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertFirstEntityAndFirstRelatedRendersRow()
    }

    @test()
    protected static async ifPassingRecordIdPassesEntityToBuildTarget() {
        this.dropInDetailViewWithLocationAndOneRelated()

        let passedValues: Record<string, any> | undefined
        let passedEntity: string | undefined

        this.firstRelatedEntity.list.buildTarget = (detailEntityId, values) => {
            passedEntity = detailEntityId
            passedValues = values
        }

        await this.assertFirstEntityAndFirstRelatedRendersRow(this.locationId)
        assert.isEqualDeep(passedValues, this.fakedLocations[0])
        assert.isEqual(passedEntity, this.firstEntityId)
    }

    @test()
    protected static async throwsWhenLoadPayloadDoesNotMatchOnSingleField() {
        await this.loadAndAssertPayloadsDoNotMatch(
            {
                name: generateId(),
            },
            {
                name: generateId(),
            }
        )
    }

    @test()
    protected static async throwsWhenLoadPayloadDoesNotMatchOnSecondField() {
        const name = generateId()
        await this.loadAndAssertPayloadsDoNotMatch(
            {
                name,
                isPublic: true,
            },
            {
                name,
                isPublic: false,
            }
        )
    }

    @test()
    protected static async passesWhenLoadPayloadDoesMatch() {
        const payload = {
            name: generateId(),
        }

        this.dropInDetailViewWithCreateOrgEventAndOneRelated(payload)

        await this.assertDetailLoadTargetAndPayloadEquals({
            expectedPayload: payload,
        })
    }

    @test()
    protected static async throwsWhenRelatedEntityPayloadDoesNotMatch() {
        await this.assertDetailListPayloadMissmatchThrows(
            {
                shouldOnlyShowWhereIAmEmployed: false,
            },
            {
                shouldOnlyShowWhereIAmEmployed: true,
            }
        )
    }

    @test()
    protected static async throwsWhenRelatedPayloadDoesNotMatchOnSecondField() {
        await this.assertDetailListPayloadMissmatchThrows(
            {
                shouldOnlyShowWhereIAmEmployed: true,
                paging: {
                    pageSize: 3,
                },
            },
            {
                shouldOnlyShowWhereIAmEmployed: true,
                paging: {
                    pageSize: 5,
                },
            }
        )
    }

    @test()
    protected static async passesWhenRelatedEntityPayloadMatches() {
        const payload = {
            shouldOnlyShowWhereIAmEmployed: true,
        }

        this.dropInDetailViewWithLocationAndOneRelated()
        this.setFirstRelatedBuiltPayload(payload)

        await this.assertRelatedExistsInFirstEntity(this.firstRelatedEntityId, {
            list: {
                //@ts-ignore
                payload,
            },
        })
    }

    @test()
    protected static async assertListPayloadMatchingOnPayloadStillThrowsWhenOtherOptionsDontMatch() {
        this.dropInDetailViewWithLocationAndOneRelated()
        const payload = {
            shouldOnlyShowWhereIAmEmployed: true,
        }

        this.setFirstRelatedBuiltPayload(payload)

        await this.assertThrowsWhenFirstRelatedOptionsDontMatch({
            pluralTitle: generateId(),
            list: {
                //@ts-ignore
                payload,
            },
        })
    }

    @test()
    protected static async assertingIfRowIsSelectedThrowsWithMissing() {
        const err = await assert.doesThrowAsync(() =>
            //@ts-ignore
            crudAssert.relatedEntityRowsSelectAsExpected()
        )

        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: [
                'skillView',
                'entityId',
                'relatedId',
                'selectedRecord',
                'deselectedRecord',
            ],
        })
    }

    @test()
    protected static async assertingIfRelatedRowIsSelectedThrowsWhenNotSelected() {
        this.dropInDetailViewWithLocationAndOneRelated()
        await this.assertRelatedRowIsSelectedThrows('function')
    }

    @test()
    protected static async throwsIfRelatedRowSelectedButNotDeselected() {
        this.dropInDetailViewWithLocationAndOneRelated()
        this.firstRelatedEntity.list.isRowSelected = () => true
        await this.assertRelatedRowIsSelectedThrows('not be')
    }

    @test()
    protected static async passesIfRelatedRowIsSelected() {
        this.dropInDetailViewWithLocationAndOneRelated()
        const selected = [false, true]
        this.firstRelatedEntity.list.isRowSelected = () => selected.pop()!
        await this.assertRelatedRowIsSelected()
    }

    @test()
    protected static async throwsIfIsSelectedReturnsFalseForSelectedRelatedRow() {
        this.dropInDetailViewWithLocationAndOneRelated()
        this.firstRelatedEntity.list.isRowSelected = () => false
        await this.assertRelatedRowIsSelectedThrows()
    }

    @test()
    protected static async assertSelectedRowGetsPassedSelectedAndThenDeselectedRecords() {
        this.dropInDetailViewWithLocationAndOneRelated()

        const passedRecords: Record<string, any>[] = []

        const selected = [false, true]
        this.firstRelatedEntity.list.isRowSelected = (record) => {
            passedRecords.push(record)
            return selected.pop()!
        }

        await this.assertRelatedRowIsSelected()

        assert.isEqualDeep(passedRecords, [
            this.fakedLocations[0],
            this.fakedLocations[1],
        ])
    }

    @test()
    protected static async assertSelectedPassesThoughRecordId() {
        let wasHit = false
        const expected = generateId()
        await this.eventFaker.fakeGetLocation(() => {
            wasHit = true
        })

        this.dropInDetailViewWithLocationAndOneRelated()
        this.firstRelatedEntity.list.isRowSelected = () => false
        await this.assertRelatedRowIsSelectedThrows(undefined, expected)
        assert.isTrue(wasHit)
    }

    private static async assertRelatedRowIsSelectedThrows(
        msg?: string,
        recordId?: string
    ) {
        await assert.doesThrowAsync(
            () => this.assertRelatedRowIsSelected(recordId),
            msg ?? 'not selected'
        )
    }

    private static assertRelatedRowIsSelected(recordId?: string): any {
        return crudAssert.relatedEntityRowsSelectAsExpected({
            skillView: this.vc,
            entityId: this.firstEntityId,
            relatedId: this.firstRelatedEntityId,
            selectedRecord: this.fakedLocations[0],
            recordId,
            deselectedRecord: this.fakedLocations[1],
        })
    }

    private static async assertDetailListPayloadMissmatchThrows(
        actual: SpruceSchemas.Mercury.v2020_12_25.ListLocationsEmitPayload,
        expected: SpruceSchemas.Mercury.v2020_12_25.ListLocationsEmitPayload
    ) {
        this.dropInDetailViewWithLocationAndOneRelated()
        this.setFirstRelatedBuiltPayload(actual)

        await this.assertThrowsWhenFirstRelatedOptionsDontMatch({
            list: {
                //@ts-ignore
                payload: expected,
            },
        })
    }

    private static setFirstRelatedBuiltPayload(
        actual: SpruceSchemas.Mercury.v2020_12_25.ListLocationsEmitPayload
    ) {
        this.firstRelatedEntity.list.buildPayload = () => actual
    }

    private static async loadAndAssertPayloadsDoNotMatch(
        actual: CreateOrgPayload,
        expected: CreateOrgPayload
    ) {
        this.dropInDetailViewWithCreateOrgEventAndOneRelated(actual)
        await this.assertLoadTargetAndPayloadDoNotMatch(undefined, expected)
    }

    private static dropInDetailViewWithCreateOrgEventAndOneRelated(
        payload?: CreateOrgPayload
    ) {
        this.dropInDetailViewWithLocationAndOneRelated()

        this.firstEntity.load = {
            fqen: `create-organization::v2020_12_25`,
            buildPayload: () => payload,
            responseKey: 'organization',
        }
    }

    private static async assertFirstEntityAndFirstRelatedRendersRow(
        recordId?: string
    ) {
        await this.assertDetailViewRendersRelatedRow({
            entityId: this.firstEntityId,
            relatedId: this.firstRelatedEntityId,
            rowId: this.locationId,
            recordId,
        })
    }

    private static async assertDetailViewRendersRelatedRowThrows(options: {
        entityId: string
        relatedId: string
        rowId: string
        message: string
    }) {
        const { entityId, relatedId, rowId, message } = options
        await assert.doesThrowAsync(
            () =>
                this.assertDetailViewRendersRelatedRow({
                    entityId,
                    relatedId,
                    rowId,
                }),
            message
        )
    }

    private static async assertDetailViewRendersRelatedRow(options: {
        entityId: string
        relatedId: string
        rowId: string
        recordId?: string
    }) {
        await crudAssert.detailRendersRelatedRow({
            skillView: this.vc,
            ...options,
        })
    }

    private static dropInDetailViewWithLocationAndSetFirstRelatedBuiltTarget(target: {
        organizationId: string
    }) {
        this.dropInDetailViewWithLocationAndOneRelated()
        this.setFirstRelatedBuiltTarget(target)
    }

    private static async assertThrowsWhenFirstRelatedOptionsDontMatch(
        expected: RecursivePartial<CrudListEntity<SkillEventContract>>
    ) {
        await assert.doesThrowAsync(
            () =>
                this.assertRelatedExistsInFirstEntity(
                    this.firstRelatedEntityId,
                    expected
                ),
            /expected/i
        )
    }

    private static setFirstRelatedBuiltTarget(target: {
        organizationId: string
    }) {
        this.firstRelatedEntity.list.buildTarget = () => {
            return target
        }
    }

    private static get firstRelatedEntityId(): string {
        return this.firstRelatedEntity.id
    }

    private static get firstRelatedEntity() {
        return this.firstEntity.relatedEntities![0]
    }

    private static async assertRelatedExistsInFirstEntity(
        related: string,
        expectedOptions?: RecursivePartial<CrudListEntity<SkillEventContract>>
    ) {
        await crudAssert.detailRendersRelatedEntity({
            skillView: this.vc,
            entityId: this.firstEntityId,
            relatedId: related,
            recordId: this.recordId,
            expectedOptions,
        })
    }

    private static dropInDetailViewWithLocationAndOneRelated() {
        const entity = this.buildLocationDetailEntity()
        const relatedEntity = this.buildLocationListEntity()
        entity.relatedEntities = [relatedEntity]

        this.dropInDetailSkillView({
            entities: [entity],
        })
    }

    private static assertRendersDetailFewThrowsForMissmatchedOptions(
        options: Partial<DetailSkillViewControllerOptions>
    ) {
        assert.doesThrow(
            () => this.assertRendersDetailView(options),
            'Expected'
        )
    }

    private static async assertDetailLoadTargetAndPayloadEquals(
        options: Partial<AssertDetailLoadTargetPayloadOptions>
    ) {
        await crudAssert.detailLoadTargetAndPayloadEquals({
            skillView: this.vc,
            entityId: this.firstEntityId,
            recordId: this.locationId,
            ...options,
        })
    }

    private static async assertLoadTargetAndPayloadDoNotMatch(
        expectedTarget?: Record<string, any>,
        expectedPayload?: Record<string, any>
    ) {
        await assert.doesThrowAsync(
            () =>
                this.assertDetailLoadTargetAndPayloadEquals({
                    recordId: generateId(),
                    expectedTarget,
                    expectedPayload,
                }),
            expectedPayload ? 'payload does not match' : 'target does not match'
        )
    }

    private static assertRendersDetailView(
        options?: Partial<DetailSkillViewControllerOptions>
    ): any {
        return crudAssert.skillViewRendersDetailView(this.vc, options)
    }

    private static get firstEntityId(): string {
        return this.entities[0].id
    }

    private static get firstEntity() {
        return this.entities[0]
    }

    private static dropInDetailSkillView(
        options?: Partial<DetailSkillViewControllerOptions>
    ) {
        const { entities, ...rest } = options ?? {}
        this.entities = entities ?? [this.buildLocationDetailEntity()]
        this.vc.dropInDetailSkillView({
            cancelDestination: 'crud.root',
            entities: this.entities,
            ...rest,
        })
    }

    private static buildLocationDetailEntity(): CrudDetailEntity {
        return buildLocationDetailTestEntity()
    }

    private static assertRendersDetailThrowsWithMissingView(
        id: string,
        className: string
    ) {
        this.views.setController(id as any, undefined as any)
        assert.doesThrow(() => this.assertRendersDetailView(), className)
    }

    private static get locationId() {
        return this.fakedLocations[0].id
    }
}

class SkillViewWithDetailView extends AbstractSkillViewController {
    private detailSkillView?: CrudDetailSkillViewController
    public shouldLoad = true
    public shouldTriggerRenderOnLoad = true

    public dropInDetailSkillView(options: DetailSkillViewControllerOptions) {
        this.detailSkillView = this.Controller(
            'crud.detail-skill-view',
            options
        )
    }

    public async load(
        options: SkillViewControllerLoadOptions<CrudDetailSkillViewArgs>
    ) {
        if (this.shouldLoad) {
            await this.detailSkillView?.load(options)
            if (this.shouldTriggerRenderOnLoad) {
                this.triggerRender()
            }
        }
    }

    public render(): SkillView {
        return (
            this.detailSkillView?.render() ?? {
                controller: this,
            }
        )
    }
}

declare module '@sprucelabs/heartwood-view-controllers/build/types/heartwood.types' {
    interface SkillViewControllerMap {
        'fake-with-detail': SkillViewWithDetailView
    }

    interface ViewControllerMap {
        'fake-with-detail': SkillViewWithDetailView
    }
}

type CreateOrgPayload = SpruceSchemas.Mercury.v2020_12_25.CreateOrgEmitPayload
