import { DataTypes, ModelDefined } from 'sequelize'
import { Services } from '../../../constants'
import { logDatabaseError, sequelize } from '../database'

interface AccountAttributes {
    id: number
    username: string
    password: string
    service: Services
}

type AccountCreateAttributes = Omit<AccountAttributes, 'id'>

export const Account: ModelDefined<AccountAttributes, AccountCreateAttributes> = sequelize.define(
    'Accounts',
    {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        username: {
            allowNull: false,
            type: DataTypes.STRING
        },
        password: {
            allowNull: false,
            type: DataTypes.STRING
        },
        service: {
            allowNull: false,
            type: DataTypes.STRING
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE
        },
        updatedAt: {
            allowNull: false,
            type: DataTypes.DATE
        }
    }
)

/**
 * Query all the accounts from the DB
 * @return - Return all the accounts or null when an error occurred
 */
export async function getAllAccounts() {
    return await Account.findAll({ attributes: { exclude: ['password'] } })
        .then((accounts) => accounts.map((account) => account.get()))
        .catch((exception) => {
            logDatabaseError(Account, getAllAccounts, 'Failed to get all accounts', exception)
            return null
        })
}

export async function getOneAccountByService(service: Services) {
    return await Account.findOne({ where: { service } })
        .then((account) => account?.get() ?? null)
        .catch((exception) => {
            logDatabaseError(
                Account,
                getOneAccountByService,
                'Failed to get one account by service',
                exception
            )
            return null
        })
}

/**
 * @return - Return the number of count deleted or null when an error occurred
 */
export async function deleteOneAccount(id: number) {
    return await Account.destroy({ where: { id } })
        .then((affectedCount) => affectedCount)
        .catch((exception) => {
            logDatabaseError(Account, deleteOneAccount, 'Failed to delete account', exception)
            return null
        })
}

export async function createOneAccount(attributes: Omit<AccountAttributes, 'id'>) {
    return await Account.create(attributes)
        .then((account) => account?.get() ?? null)
        .catch((exception) => {
            logDatabaseError(Account, createOneAccount, 'Failed to create one account', exception)
            return null
        })
}
