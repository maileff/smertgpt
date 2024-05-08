const { Telegraf, Markup } = require('telegraf')
require('dotenv').config()
const bot = new Telegraf(process.env.BOT_TOKEN)
const Referral = require('./models/referral.js')
const mongoose = require('mongoose')

mongoose
	.connect(process.env.DB, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('Connected to MongoDB'))
	.catch(err => console.error('Failed to connect to MongoDB', err))

const channelUsername = `@akaazerbaycan`

async function incrementReferralCount(userId, referrerId) {
	try {
		let referral = await Referral.findOne({ userId: userId })

		if (!referral) {
			referral = new Referral({ userId: userId, invitedBy: referrerId })
		}

		if (!referral.invitedUsers.includes(referrerId)) {
			referral.invitedUsers.push(referrerId)
		}

		await referral.save()
	} catch (error) {
		console.error('Ошибка при увеличении счетчика рефералов:', error)
		throw new Error('Ошибка при увеличении счетчика рефералов.')
	}
}

async function getUsernameFromTelegramAPI(userId) {
	try {
		const chatMember = await bot.telegram.getChatMember(channelUsername, userId)
		if (chatMember && chatMember.user && chatMember.user.username) {
			return `@${chatMember.user.username}`
		}
		return `@id${userId}`
	} catch (error) {
		console.error('Ошибка при получении информации о пользователе:', error)
		return `@id${userId}`
	}
}

async function sendRulesMessage(ctx) {
	const userId = ctx.from.id
	const referralLink = `https://t.me/akaazerbaycan?start=${userId}`
	await ctx.replyWithPhoto(
		{ source: './img/2.jpeg' },
		{
			caption: `Azərbaycan Kriptovalyuta\nAkademiyası "refferal botu" Siz Azərbaycan Kriptovalyuta Akademiyası telegram kanal link-ini paylaşaraq qalib ola bilərsiniz. Bunun üçün aşağıda qeyd edilən link-i paylaşmağınız kifayətdir.\n📌 Qeyd : qalib referral linkindən keçib edib, kanala abonə olan şəxslərin sayına görə təyin ediləcək. Sizin göndərdiyiniz link-dən nə qədər çox şəxs kanala abone olsa qalıb olma şansınız o qədər çoxdur !\n\nPaylaşmalı olduğunuz link:\n⬇️\n${referralLink}`,
		}
	)
}

bot.start(async ctx => {
	const userId = ctx.from.id
	const referrerId = ctx.message.text.split(' ')[1]

	try {
		const chatMember = await bot.telegram.getChatMember(channelUsername, userId)

		if (
			chatMember.status !== 'member' &&
			chatMember.status !== 'administrator' &&
			chatMember.status !== 'creator'
		) {
			if (referrerId && referrerId !== userId.toString()) {
				await incrementReferralCount(userId, referrerId)
			} else {
				const existingReferral = await Referral.findOne({
					userId: userId,
					invitedBy: referrerId,
				})

				if (!existingReferral) {
					const referrerUsername = await getUsernameFromTelegramAPI(referrerId)
					await incrementReferralCount(userId, referrerId)
				}
			}
		}

		const inlineKeyboard = Markup.inlineKeyboard([
			Markup.button.callback('✅Yoxla', 'check_subscription'),
		])

		ctx.reply(
			'🪬  Yarışmaya qatılmaq üçün siz bu səhifəyə abunə olmalısız @akaazerbaycan',
			{
				reply_markup: {
					inline_keyboard: inlineKeyboard.reply_markup.inline_keyboard,
				},
			}
		)
	} catch (error) {
		console.error('Ошибка при обработке команды /start:', error)
		ctx.reply('Произошла ошибка, пожалуйста, попробуйте еще раз.')
	}
})

bot.action('check_subscription', async ctx => {
	const userId = ctx.callbackQuery.from.id
	const userName = ctx.callbackQuery.from.username

	try {
		const chatMember = await bot.telegram.getChatMember(channelUsername, userId)

		if (
			chatMember.status === 'member' ||
			chatMember.status === 'administrator' ||
			chatMember.status === 'creator'
		) {
			const referralLink = `https://t.me/akaazerbaycan_bot?start=${userId}`
			await ctx.replyWithPhoto(
				{ source: './img/1.jpeg' },
				{
					caption: `Telegramda yeni " Giwe away" 🎁🥰\n\nQalib olmaq çox asandır ❗\n\nTelegram kanalımızın "link"-ini  ( https://t.me/akaazerbaycan )  dostlarınızla bölüşün və hədiyyə qazanın. 😍\n\nƏn çox  keçid edilən link-in sahibi qalıb olacaq.\n\nHər kəsə uğurlar❗🥰\n\nQeyd: Minimum keçid limiti -500 dür.\n\nİlk 5 yer 🎁\n📌 I yer 100₼\n📌 II yer 50 ₼\n📌 III yer 30₼\n📌 IV yer 15₼\n📌 V yer 10₼
                        \n\nReferral linkiniz: ${referralLink}`,
				}
			)
			await ctx.reply(
				'Menu sizin üçün açıqdır, işlədə bilərsiz:',
				Markup.keyboard([['🏆LEADERBOARD', '📝RULES']]).resize()
			)
		} else {
			await ctx.replyWithMarkdown(
				`@${userName}, siz [AkaAzerbaycan](https://t.me/akaazerbaycan) telegram kanala abunə olmamısız, zəhmət olmasa abunə olun!`
			)
		}
	} catch (error) {
		console.error('Yoxlama xətası:', error)
		await ctx.reply(
			'Yoxlama ərzində xəta baş verdi, zəhmət olmasa cəhdi təkrar edin.'
		)
	}
})

bot.hears('📝RULES', async ctx => {
	const userId = ctx.from.id
	const userName = ctx.from.username

	try {
		const chatMember = await ctx.telegram.getChatMember(
			channelUsername,
			userId
		)

		if (
			chatMember.status === 'member' ||
			chatMember.status === 'administrator' ||
			chatMember.status === 'creator'
		) {
			await sendRulesMessage(ctx)
		} else {
			await ctx.replyWithMarkdown(
				`@${userName}, siz [AkaAzerbaycan](https://t.me/akaazerbaycan) telegram kanala abunə olmamısız, zəhmət olmasa abunə olun!`
			)
		}
	} catch (error) {
		console.error('Yoxlama xətası:', error)
		await ctx.reply(
			'Yoxlama ərzində xəta baş verdi, zəhmət olmasa cəhdi təkrar edin.'
		)
	}
})

async function updateLeaderboardFromDatabase() {
	try {
		const leaderboard = await Referral.aggregate([
			{ $group: { _id: '$invitedBy', referralCount: { $sum: 1 } } },
			{ $match: { _id: { $ne: null }, referralCount: { $gt: 0 } } },
			{ $sort: { referralCount: -1 } },
			{ $limit: 10 },
		])

		for (const user of leaderboard) {
			const userPosition =
				leaderboard.findIndex(item => item._id === user._id.toString()) + 1
			leaderboard[userPosition - 1] = {
				userName: user._id,
				referralCount: user.referralCount,
			}
		}
	} catch (error) {
		console.error('Ошибка при обновлении лидерборда:', error)
	}
}

async function sendLeaderboardMessage(ctx, userId) {
	try {
		const leaderboard = await Referral.aggregate([
			{ $group: { _id: '$invitedBy', referralCount: { $sum: 1 } } },
			{ $match: { _id: { $ne: null }, referralCount: { $gt: 0 } } },
			{ $sort: { referralCount: -1 } },
			{ $limit: 10 },
		])

		const userInLeaderboard = userId
			? leaderboard.find(item => item._id === userId.toString())
			: null

		const userPosition = userInLeaderboard
			? leaderboard.findIndex(
					item => item._id.toString() === userId.toString()
			  ) + 1
			: 'sıralamada deyilsiniz'

		const currentUser = await Referral.findOne({ userId })

		let leaderboardMessage =
			'Top 10, burada ən çox dəvət edən istifadəçilərin adları və dəvət olunan referalların sayı:\n'

		for (let i = 0; i < leaderboard.length; i++) {
			const user = leaderboard[i]
			if (user._id) {
				let userName = user._id
				if (!isNaN(userName)) {
					userName = await getUsernameFromTelegramAPI(userName)
				}

				leaderboardMessage += `${i + 1}. İstifadəçi: ${userName}, Dəvət edib: ${
					user.referralCount
				}\n`
			}
		}

		leaderboardMessage += `\nSizin top-da olan yeriniz: ${userPosition}. \n`

		await ctx.reply(leaderboardMessage)
	} catch (error) {
		console.error('LEADERBOARD-u açmaq alınmadı:', error)
		await ctx.reply('Xəta baş verdi, zəhmət olmasa gözlüyün!.')
	}
}

bot.hears('🏆LEADERBOARD', async ctx => {
	try {
		const userId = ctx.from.id
		const userName = ctx.from.username

		const chatMember = await ctx.telegram.getChatMember(
			channelUsername,
			userId
		)

		if (
			chatMember.status === 'member' ||
			chatMember.status === 'administrator' ||
			chatMember.status === 'creator'
		) {
			await updateLeaderboardFromDatabase(ctx)
			await sendLeaderboardMessage(ctx, userId)
		} else {
			await ctx.replyWithMarkdown(
				`@${userName}, siz [AkaAzerbaycan](https://t.me/akaazerbaycan) telegram kanala abunə olmamısız, zəhmət olmasa abunə olun!`
			)
		}
	} catch (error) {
		console.error('Ошибка:', error)
		await ctx.reply('Произошла ошибка, пожалуйста, попробуйте еще раз.')
	}
})

bot.launch()
