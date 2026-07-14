import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { ActiveWorkLog, CreatePaymentBody, CreateUserBody, CreateWorkLogBody, CreateWorkerBody, DashboardSummary, ErrorResponse, HealthStatus, LoginBody, LoginResponse, Payment, RateSetting, SetRateBody, UpdateUserBody, User, WorkLog, Worker, WorkerConflictResponse, WorkerSummary } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Login with mobile + password
 */
export declare const getLoginUrl: () => string;
export declare const login: (loginBody: LoginBody, options?: RequestInit) => Promise<LoginResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginBody>;
export type LoginMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Login with mobile + password
 */
export declare const useLogin: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
/**
 * @summary Get current user info
 */
export declare const getGetMeUrl: () => string;
export declare const getMe: (options?: RequestInit) => Promise<User>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get current user info
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all users (admin only)
 */
export declare const getListUsersUrl: () => string;
export declare const listUsers: (options?: RequestInit) => Promise<User[]>;
export declare const getListUsersQueryKey: () => readonly ["/api/users"];
export declare const getListUsersQueryOptions: <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>;
export type ListUsersQueryError = ErrorType<unknown>;
/**
 * @summary List all users (admin only)
 */
export declare function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new user (admin only)
 */
export declare const getCreateUserUrl: () => string;
export declare const createUser: (createUserBody: CreateUserBody, options?: RequestInit) => Promise<User>;
export declare const getCreateUserMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<CreateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<CreateUserBody>;
}, TContext>;
export type CreateUserMutationResult = NonNullable<Awaited<ReturnType<typeof createUser>>>;
export type CreateUserMutationBody = BodyType<CreateUserBody>;
export type CreateUserMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Create a new user (admin only)
 */
export declare const useCreateUser: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<CreateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<CreateUserBody>;
}, TContext>;
/**
 * @summary Update user password (admin only)
 */
export declare const getUpdateUserUrl: (id: number) => string;
export declare const updateUser: (id: number, updateUserBody: UpdateUserBody, options?: RequestInit) => Promise<User>;
export declare const getUpdateUserMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
export type UpdateUserMutationResult = NonNullable<Awaited<ReturnType<typeof updateUser>>>;
export type UpdateUserMutationBody = BodyType<UpdateUserBody>;
export type UpdateUserMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update user password (admin only)
 */
export declare const useUpdateUser: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        id: number;
        data: BodyType<UpdateUserBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUser>>, TError, {
    id: number;
    data: BodyType<UpdateUserBody>;
}, TContext>;
/**
 * @summary Delete a user (admin only)
 */
export declare const getDeleteUserUrl: (id: number) => string;
export declare const deleteUser: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteUserMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
    id: number;
}, TContext>;
export type DeleteUserMutationResult = NonNullable<Awaited<ReturnType<typeof deleteUser>>>;
export type DeleteUserMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a user (admin only)
 */
export declare const useDeleteUser: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteUser>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteUser>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List all workers with payment summary
 */
export declare const getListWorkersUrl: () => string;
export declare const listWorkers: (options?: RequestInit) => Promise<WorkerSummary[]>;
export declare const getListWorkersQueryKey: () => readonly ["/api/workers"];
export declare const getListWorkersQueryOptions: <TData = Awaited<ReturnType<typeof listWorkers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listWorkers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListWorkersQueryResult = NonNullable<Awaited<ReturnType<typeof listWorkers>>>;
export type ListWorkersQueryError = ErrorType<unknown>;
/**
 * @summary List all workers with payment summary
 */
export declare function useListWorkers<TData = Awaited<ReturnType<typeof listWorkers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new worker
 */
export declare const getCreateWorkerUrl: () => string;
export declare const createWorker: (createWorkerBody: CreateWorkerBody, options?: RequestInit) => Promise<Worker>;
export declare const getCreateWorkerMutationOptions: <TError = ErrorType<ErrorResponse | WorkerConflictResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorker>>, TError, {
        data: BodyType<CreateWorkerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createWorker>>, TError, {
    data: BodyType<CreateWorkerBody>;
}, TContext>;
export type CreateWorkerMutationResult = NonNullable<Awaited<ReturnType<typeof createWorker>>>;
export type CreateWorkerMutationBody = BodyType<CreateWorkerBody>;
export type CreateWorkerMutationError = ErrorType<ErrorResponse | WorkerConflictResponse>;
/**
 * @summary Create a new worker
 */
export declare const useCreateWorker: <TError = ErrorType<ErrorResponse | WorkerConflictResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorker>>, TError, {
        data: BodyType<CreateWorkerBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createWorker>>, TError, {
    data: BodyType<CreateWorkerBody>;
}, TContext>;
/**
 * @summary Get single worker details
 */
export declare const getGetWorkerUrl: (id: number) => string;
export declare const getWorker: (id: number, options?: RequestInit) => Promise<WorkerSummary>;
export declare const getGetWorkerQueryKey: (id: number) => readonly [`/api/workers/${number}`];
export declare const getGetWorkerQueryOptions: <TData = Awaited<ReturnType<typeof getWorker>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorker>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorker>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorkerQueryResult = NonNullable<Awaited<ReturnType<typeof getWorker>>>;
export type GetWorkerQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get single worker details
 */
export declare function useGetWorker<TData = Awaited<ReturnType<typeof getWorker>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorker>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get work logs for a worker
 */
export declare const getGetWorkerLogsUrl: (id: number) => string;
export declare const getWorkerLogs: (id: number, options?: RequestInit) => Promise<WorkLog[]>;
export declare const getGetWorkerLogsQueryKey: (id: number) => readonly [`/api/workers/${number}/logs`];
export declare const getGetWorkerLogsQueryOptions: <TData = Awaited<ReturnType<typeof getWorkerLogs>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorkerLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorkerLogs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorkerLogsQueryResult = NonNullable<Awaited<ReturnType<typeof getWorkerLogs>>>;
export type GetWorkerLogsQueryError = ErrorType<unknown>;
/**
 * @summary Get work logs for a worker
 */
export declare function useGetWorkerLogs<TData = Awaited<ReturnType<typeof getWorkerLogs>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorkerLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get payment history for a worker
 */
export declare const getGetWorkerPaymentsUrl: (id: number) => string;
export declare const getWorkerPayments: (id: number, options?: RequestInit) => Promise<Payment[]>;
export declare const getGetWorkerPaymentsQueryKey: (id: number) => readonly [`/api/workers/${number}/payments`];
export declare const getGetWorkerPaymentsQueryOptions: <TData = Awaited<ReturnType<typeof getWorkerPayments>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorkerPayments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorkerPayments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorkerPaymentsQueryResult = NonNullable<Awaited<ReturnType<typeof getWorkerPayments>>>;
export type GetWorkerPaymentsQueryError = ErrorType<unknown>;
/**
 * @summary Get payment history for a worker
 */
export declare function useGetWorkerPayments<TData = Awaited<ReturnType<typeof getWorkerPayments>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorkerPayments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Save a completed work session
 */
export declare const getCreateWorkLogUrl: () => string;
export declare const createWorkLog: (createWorkLogBody: CreateWorkLogBody, options?: RequestInit) => Promise<WorkLog>;
export declare const getCreateWorkLogMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorkLog>>, TError, {
        data: BodyType<CreateWorkLogBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createWorkLog>>, TError, {
    data: BodyType<CreateWorkLogBody>;
}, TContext>;
export type CreateWorkLogMutationResult = NonNullable<Awaited<ReturnType<typeof createWorkLog>>>;
export type CreateWorkLogMutationBody = BodyType<CreateWorkLogBody>;
export type CreateWorkLogMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Save a completed work session
 */
export declare const useCreateWorkLog: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorkLog>>, TError, {
        data: BodyType<CreateWorkLogBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createWorkLog>>, TError, {
    data: BodyType<CreateWorkLogBody>;
}, TContext>;
/**
 * @summary Get active (in-progress) work session if any
 */
export declare const getGetActiveWorkLogUrl: () => string;
export declare const getActiveWorkLog: (options?: RequestInit) => Promise<ActiveWorkLog>;
export declare const getGetActiveWorkLogQueryKey: () => readonly ["/api/work-logs/active"];
export declare const getGetActiveWorkLogQueryOptions: <TData = Awaited<ReturnType<typeof getActiveWorkLog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActiveWorkLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getActiveWorkLog>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetActiveWorkLogQueryResult = NonNullable<Awaited<ReturnType<typeof getActiveWorkLog>>>;
export type GetActiveWorkLogQueryError = ErrorType<unknown>;
/**
 * @summary Get active (in-progress) work session if any
 */
export declare function useGetActiveWorkLog<TData = Awaited<ReturnType<typeof getActiveWorkLog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getActiveWorkLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a payment for a worker
 */
export declare const getCreatePaymentUrl: () => string;
export declare const createPayment: (createPaymentBody: CreatePaymentBody, options?: RequestInit) => Promise<Payment>;
export declare const getCreatePaymentMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPayment>>, TError, {
        data: BodyType<CreatePaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPayment>>, TError, {
    data: BodyType<CreatePaymentBody>;
}, TContext>;
export type CreatePaymentMutationResult = NonNullable<Awaited<ReturnType<typeof createPayment>>>;
export type CreatePaymentMutationBody = BodyType<CreatePaymentBody>;
export type CreatePaymentMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Add a payment for a worker
 */
export declare const useCreatePayment: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPayment>>, TError, {
        data: BodyType<CreatePaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPayment>>, TError, {
    data: BodyType<CreatePaymentBody>;
}, TContext>;
/**
 * @summary Get current amount per hour
 */
export declare const getGetRateUrl: () => string;
export declare const getRate: (options?: RequestInit) => Promise<RateSetting>;
export declare const getGetRateQueryKey: () => readonly ["/api/settings/rate"];
export declare const getGetRateQueryOptions: <TData = Awaited<ReturnType<typeof getRate>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRate>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRateQueryResult = NonNullable<Awaited<ReturnType<typeof getRate>>>;
export type GetRateQueryError = ErrorType<unknown>;
/**
 * @summary Get current amount per hour
 */
export declare function useGetRate<TData = Awaited<ReturnType<typeof getRate>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Set amount per hour
 */
export declare const getSetRateUrl: () => string;
export declare const setRate: (setRateBody: SetRateBody, options?: RequestInit) => Promise<RateSetting>;
export declare const getSetRateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setRate>>, TError, {
        data: BodyType<SetRateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setRate>>, TError, {
    data: BodyType<SetRateBody>;
}, TContext>;
export type SetRateMutationResult = NonNullable<Awaited<ReturnType<typeof setRate>>>;
export type SetRateMutationBody = BodyType<SetRateBody>;
export type SetRateMutationError = ErrorType<unknown>;
/**
 * @summary Set amount per hour
 */
export declare const useSetRate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setRate>>, TError, {
        data: BodyType<SetRateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setRate>>, TError, {
    data: BodyType<SetRateBody>;
}, TContext>;
/**
 * @summary Get overall dashboard summary totals
 */
export declare const getGetDashboardSummaryUrl: () => string;
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get overall dashboard summary totals
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map