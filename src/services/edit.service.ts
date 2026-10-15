import { ELEMENT_LOCK_REPOSITORY } from '../repository';

export class EditService {
  public async beginEdit(
    roomId: string,
    participantId: string,
    editId: string,
    elementIds: string[],
  ): Promise<boolean> {
    const result = await ELEMENT_LOCK_REPOSITORY.acquire(
      roomId,
      participantId,
      editId,
      elementIds,
    );

    return result.acquired;
  }

  public async keepAlive(
    roomId: string,
    participantId: string,
    editId: string,
    elementIds: string[],
  ): Promise<boolean> {
    return ELEMENT_LOCK_REPOSITORY.renew(
      roomId,
      participantId,
      editId,
      elementIds,
    );
  }

  public async endEdit(
    roomId: string,
    participantId: string,
    editId: string,
    elementIds: string[],
  ): Promise<void> {
    await ELEMENT_LOCK_REPOSITORY.release(
      roomId,
      participantId,
      editId,
      elementIds,
    );
  }
}

export const EDIT_SERVICE = new EditService();