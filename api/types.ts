// --- 1. Типизация вложенных объектов ---

/**
 * Типизация для полей профиля пользователя (FIELDS)
 */
export interface ISpringUserField {
  /** Системное или пользовательское имя поля, например, "FIRST_NAME" или "USER_DEFINED_FIELD2". */
  name: string;
  /** Значение поля. */
  value: string;
}

/**
 * Типизация для ролей пользователя (userRoles)
 */
export interface ISpringUserRole {
  /** ID роли. */
  roleId: string;
  /** Тип роли, например, "learner", "admin", "author". */
  roleType: string;
}

/**
 * Типизация для информации о субординации (subordination/coSubordination)
 */
export interface ISpringSubordination {
  /** Тип субординации, например, "no_supervisor". */
  subordinationType: string;
}

// --- 2. Типизация основного объекта пользователя ---

/**
 * ВНИМАНИЕ: Этот интерфейс расширен.
 * Он должен соответствовать вашему локальному коду, который ожидает
 * email, firstName и lastName на верхнем уровне, несмотря на то,
 * что API возвращает их в массиве 'fields'.
 */
export interface ISpringUser {
  /** Уникальный идентификатор пользователя (UUID). */
  userId: string;
  /** Статус пользователя (например, 1 - активный). */
  status: number;
  /** Массив ID групп. */
  groups: string[];
  /** Дата добавления пользователя. */
  addedDate: string; // Формат 'yyyy-mm-dd'
  /** ID подразделения, к которому приписан пользователь. */
  departmentId: string;

  // Поля, которые мы извлекаем и добавляем через transformUser
  email: string;
  firstName: string;
  lastName: string;

  /** Список полей профиля (как в ответе API). */
  fields: ISpringUserField[];
  /** Список ролей пользователя. */
  userRoles: ISpringUserRole[];
  /** Информация о ко-субординации (дополнительный руководитель). */
  coSubordination: ISpringSubordination;
  /** Основная роль пользователя (строка). */
  role: string;
  /** ID основной роли пользователя. */
  roleId: string;
  /** Информация о субординации (руководитель). */
  subordination: ISpringSubordination;
}

// --- 3. Типизация полного ответа API ---

/**
 * Типизация для корневого объекта ответа API /api/v2/user/list
 */
export interface ISpringUserListResponse {
  /** Текущий номер страницы. */
  pageNumber: number;
  /** Общее количество пользователей, соответствующих фильтрам. */
  totalUsersNumber: number;
  /** Массив профилей пользователей на текущей странице (сырой формат API). */
  userProfiles: ISpringUser[];
}
