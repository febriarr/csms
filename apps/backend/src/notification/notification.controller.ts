import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
    createNotificationRecipientSchema,
    type CreateNotificationRecipientInput,
    idParamSchema,
    type IdParam,
    notificationRecipientQuerySchema,
    type NotificationRecipientQuery,
    replaceSubscriptionsSchema,
    type ReplaceSubscriptionsInput,
    updateNotificationRecipientSchema,
    type UpdateNotificationRecipientInput,
} from '@workspace/validator';
import { NotificationService, RecipientWithSubscriptions } from './notification.service';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';

@Controller('notification-recipients')
export class NotificationController {
    constructor(private readonly service: NotificationService) {}

    @Get()
    list(
        @Query(new ZodValidationPipe(notificationRecipientQuerySchema)) query: NotificationRecipientQuery,
    ): Promise<RecipientWithSubscriptions[]> {
        return this.service.listRecipients(query);
    }

    @Get(':id')
    findOne(@Param(new ZodValidationPipe(idParamSchema)) { id }: IdParam): Promise<RecipientWithSubscriptions> {
        return this.service.getRecipient(id);
    }

    @Post()
    create(
        @Body(new ZodValidationPipe(createNotificationRecipientSchema)) body: CreateNotificationRecipientInput,
    ): Promise<RecipientWithSubscriptions> {
        return this.service.createRecipient(body);
    }

    @Patch(':id')
    update(
        @Param(new ZodValidationPipe(idParamSchema)) { id }: IdParam,
        @Body(new ZodValidationPipe(updateNotificationRecipientSchema)) body: UpdateNotificationRecipientInput,
    ): Promise<RecipientWithSubscriptions> {
        return this.service.updateRecipient(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param(new ZodValidationPipe(idParamSchema)) { id }: IdParam): Promise<void> {
        return this.service.deleteRecipient(id);
    }

    /** "Save" of the subscription screen: the sent list replaces the current one. */
    @Put(':id/subscriptions')
    replaceSubscriptions(
        @Param(new ZodValidationPipe(idParamSchema)) { id }: IdParam,
        @Body(new ZodValidationPipe(replaceSubscriptionsSchema)) body: ReplaceSubscriptionsInput,
    ): Promise<RecipientWithSubscriptions> {
        return this.service.replaceSubscriptions(id, body);
    }
}
