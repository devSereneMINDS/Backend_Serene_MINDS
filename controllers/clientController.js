import sql from "../config/db.js";

async function getClientsList(req, res) {
    const users = await sql`
        select *
        from clients
    `
    res.status(200).send(users);
}

async function createClient(req, res) {
    const {name, email, contact_primary, contact_secondary} = req.body;
    const newUser = await sql`
        insert into clients (name, email, contact_primary, contact_secondary)
        values(${name}, ${email}, ${contact_primary}, ${contact_secondary})
        returning (name, email)
    `
    res.status(201).send({
        message: "Client onboarded successfully",
        data: newUser
    })
}

async function getProfessionalClients(req, res) {
    const professionalId = req.params.professionalId;
    const users = await sql`
        select *
        from clients
        where professional=${professionalId}
    `
    res.status(200).send(users);
}


async function getClientDetails(req, res) {
    const clientId = req.params.clientId;
    const userDetails = await sql`
        select clients.*,
        json_build_object(
            'id', professionals.id,
            'name', professionals.name,
            'email', professionals.email
        ) AS professional
        from clients
        left join professionals
        on clients.professional = professionals.id
        where clients.id=${clientId}
    `
    res.status(200).send(userDetails);
}

export {
    getClientsList,
    getProfessionalClients,
    getClientDetails,
    createClient,
}