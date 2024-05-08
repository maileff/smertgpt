const mongoose = require('mongoose')

const referralSchema = new mongoose.Schema({
	userId: { type: Number, required: true },
	referralCount: { type: Number, default: 0 },
	invitedBy: { type: Number },
	invitedUsers: [{ type: Number }],
})

referralSchema.statics.incrementReferralCount = async function (
	userId,
	invitedBy
) {
	try {
		userId = parseInt(userId)
		invitedBy = parseInt(invitedBy)

		let userExists = await this.exists({ userId })

		if (!userExists) {
			await this.create({
				userId,
				invitedBy,
				joinedChannel: false,
			})
		}

		let referral = await this.findOneAndUpdate(
			{ userId },
			{
				$inc: { referralCount: 1 },
				$set: { invitedBy, joinedChannel: true },
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		)

		if (!referral) {
			throw new Error('Failed to create or update referral')
		}

		await this.updateOne(
			{ userId: invitedBy },
			{
				$addToSet: { invitedUsers: userId },
			}
		)

		const previousInvites = await this.find({
			invitedBy: userId,
			joinedChannel: true,
		})
		for (const previousInvite of previousInvites) {
			if (!previousInvite.invitedUsers.includes(invitedBy)) {
				await this.updateOne(
					{ userId: previousInvite.invitedBy },
					{
						$inc: { referralCount: 1 },
						$addToSet: { invitedUsers: invitedBy },
					},
					{ upsert: true }
				)
			}
		}

		return referral
	} catch (error) {
		console.error('Error:', error)
		throw error
	}
}

referralSchema.statics.checkInvitedUsersCount = async function (referrerId) {
	try {
		const invitedUsers = await this.find({
			invitedBy: referrerId,
			joinedChannel: true,
		})

		return invitedUsers.length
	} catch (error) {
		console.error('Error:', error)
		return 0
	}
}

const Referral = mongoose.model('Referral', referralSchema)

module.exports = Referral
